/* ===== GRUPOP — app.js ===== */
const WORKER = "https://grupop-rsvp.gammasg.workers.dev";

/* Shows: agregá acá cada fecha nueva. El "id" es único y no se cambia (es la clave del contador). */
const SHOWS = [
  {
    id: "hilos-2026-10-02",
    fecha: "Viernes 2 de octubre",
    hora: "21:00 hs",
    lugar: "Hilos Bar",
    direccion: "Juan Larrea 1518, B° General Paz",
    ciudad: "Córdoba",
    img: "assets/img/show-hilos.png",
    mapa: "https://maps.google.com/?q=Juan+Larrea+1518+Cordoba",
  },
];

/* reveal on scroll — IntersectionObserver propio (no depende de scroll events, va bien con Lenis) */
function initReveal() {
  const els = document.querySelectorAll("[data-aos]");
  els.forEach((el) => {
    const d = el.getAttribute("data-aos-delay");
    if (d) el.style.transitionDelay = d + "ms";
  });
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((el) => io.observe(el));
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderShows();
  initPlayer();
  initGallery();
  initReveal();
  if (window.lucide) lucide.createIcons();
});

/* Lenis smooth scroll */
if (window.Lenis) {
  const lenis = new Lenis({ duration: 1.1 });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const el = document.querySelector(a.getAttribute("href"));
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -60 }); closeMenu(); }
    })
  );
}

/* ---------- nav ---------- */
const nav = document.getElementById("nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 30));
const navLinks = document.getElementById("navLinks");
document.getElementById("navToggle").addEventListener("click", () => navLinks.classList.toggle("open"));
function closeMenu() { navLinks.classList.remove("open"); }

/* ---------- shows ---------- */
function renderShows() {
  const list = document.getElementById("showsList");
  const empty = document.getElementById("showsEmpty");
  if (!SHOWS.length) { empty.hidden = false; return; }

  list.innerHTML = SHOWS.map((s) => {
    const done = localStorage.getItem("rsvp:" + s.id);
    return `
    <article class="show" data-aos="fade-up">
      <img class="show__img" src="${s.img}" alt="${s.lugar} — ${s.fecha}">
      <div class="show__body">
        <div class="show__date"><i data-lucide="calendar"></i> ${s.fecha} · ${s.hora}</div>
        <div class="show__place">
          <h3>${s.lugar}</h3>
          <p><i data-lucide="map-pin"></i> ${s.direccion}, ${s.ciudad}</p>
        </div>
        <div class="show__count">
          <i data-lucide="users"></i>
          <div><b id="count-${s.id}">—</b> <span>ya confirmaron</span></div>
        </div>
        <div class="show__actions">
          <button class="btn btn--primary" data-rsvp="${s.id}" ${done ? "disabled" : ""}>
            <i data-lucide="${done ? "check" : "hand"}"></i> ${done ? "Ya confirmaste" : "Voy a ir"}
          </button>
          <a class="btn btn--ghost" href="${s.mapa}" target="_blank" rel="noopener"><i data-lucide="map"></i> Cómo llegar</a>
        </div>
      </div>
    </article>`;
  }).join("");

  document.querySelectorAll("[data-rsvp]").forEach((b) =>
    b.addEventListener("click", () => openModal(b.dataset.rsvp))
  );
  SHOWS.forEach((s) => refreshCount(s.id));
  if (window.lucide) lucide.createIcons();
}

async function refreshCount(id) {
  try {
    const r = await fetch(`${WORKER}/count?show=${encodeURIComponent(id)}`);
    const d = await r.json();
    const el = document.getElementById("count-" + id);
    if (el) el.textContent = d.people ?? 0;
  } catch { /* si el worker no responde, queda el "—" */ }
}

/* ---------- modal RSVP ---------- */
const modal = document.getElementById("modal");
const rsvpForm = document.getElementById("rsvpForm");
const rsvpMsg = document.getElementById("rsvpMsg");
let currentShow = null;

function openModal(id) {
  currentShow = SHOWS.find((s) => s.id === id);
  if (!currentShow) return;
  document.getElementById("modalShow").textContent =
    `${currentShow.lugar} · ${currentShow.fecha}`;
  rsvpMsg.textContent = ""; rsvpMsg.className = "rsvp__msg";
  rsvpForm.reset();
  modal.hidden = false;
}
function closeModal() { modal.hidden = true; }
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

rsvpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentShow) return;
  const btn = document.getElementById("rsvpSubmit");
  const fd = new FormData(rsvpForm);
  const cantidad = parseInt(fd.get("cantidad"), 10) || 1;
  btn.disabled = true; rsvpMsg.className = "rsvp__msg"; rsvpMsg.textContent = "Enviando...";

  try {
    const r = await fetch(`${WORKER}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show: currentShow.id,
        nombre: fd.get("nombre"),
        cantidad,
        tel: fd.get("tel"),
      }),
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Error");

    localStorage.setItem("rsvp:" + currentShow.id, "1");
    // update optimista del contador (por si el list del worker tarda en propagar)
    const el = document.getElementById("count-" + currentShow.id);
    if (el) el.textContent = Math.max(Number(d.people) || 0, (Number(el.textContent) || 0) + cantidad);
    const btnCard = document.querySelector(`[data-rsvp="${currentShow.id}"]`);
    if (btnCard) { btnCard.disabled = true; btnCard.innerHTML = '<i data-lucide="check"></i> Ya confirmaste'; }

    rsvpMsg.className = "rsvp__msg ok";
    rsvpMsg.textContent = "¡Listo! Te esperamos 🤘";
    if (window.lucide) lucide.createIcons();
    setTimeout(closeModal, 1600);
  } catch (err) {
    rsvpMsg.className = "rsvp__msg err";
    rsvpMsg.textContent = "No se pudo confirmar. Probá de nuevo.";
  } finally {
    btn.disabled = false;
  }
});

/* ---------- player ---------- */
function initPlayer() {
  let current = null; // {audio, el}
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${ss}`;
  };

  document.querySelectorAll(".track").forEach((el) => {
    const audio = new Audio();
    audio.preload = "none";
    audio.src = el.dataset.src;
    const btn = el.querySelector(".track__play");
    const prog = el.querySelector(".track__prog");
    const bar = el.querySelector(".track__bar");
    const time = el.querySelector(".track__time");
    const setIcon = (name) => { btn.innerHTML = `<i data-lucide="${name}"></i>`; if (window.lucide) lucide.createIcons(); };

    btn.addEventListener("click", () => {
      if (current && current.audio !== audio) {
        current.audio.pause();
        current.el.classList.remove("playing");
        current.setIcon("play");
      }
      if (audio.paused) { audio.play(); el.classList.add("playing"); setIcon("pause"); current = { audio, el, setIcon }; }
      else { audio.pause(); el.classList.remove("playing"); setIcon("play"); }
    });

    audio.addEventListener("timeupdate", () => {
      prog.style.width = (audio.currentTime / audio.duration) * 100 + "%";
      time.textContent = fmt(audio.duration - audio.currentTime);
    });
    audio.addEventListener("ended", () => { el.classList.remove("playing"); setIcon("play"); prog.style.width = "0%"; });
    bar.addEventListener("click", (e) => {
      const rect = bar.getBoundingClientRect();
      if (audio.duration) audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  });
}

/* ---------- galería lightbox ---------- */
function initGallery() {
  const imgs = [...document.querySelectorAll(".gallery img")];
  if (!imgs.length) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = '<img alt="GRUPOP en vivo"><button class="lightbox__x" aria-label="Cerrar">&times;</button>';
  box.style.cssText = "position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.9);padding:24px;cursor:zoom-out";
  const bimg = box.querySelector("img");
  bimg.style.cssText = "max-width:92vw;max-height:88vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6)";
  const x = box.querySelector(".lightbox__x");
  x.style.cssText = "position:absolute;top:20px;right:26px;background:none;border:none;color:#fff;font-size:44px;line-height:1;cursor:pointer";
  document.body.appendChild(box);
  const close = () => (box.style.display = "none");
  imgs.forEach((im) => im.addEventListener("click", () => { bimg.src = im.src; box.style.display = "flex"; }));
  box.addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
