/* ============ GRUPOP — app.js ============ */
const WORKER = "https://grupop-rsvp.gammasg.workers.dev";

/* Shows: agregá acá cada fecha nueva. El "id" es único y no se cambia (es la clave del contador).
   "dt" en ISO con -03:00 (hora Argentina) alimenta el countdown. */
const SHOWS = [
  {
    id: "hilos-2026-10-02",
    dt: "2026-10-02T21:00:00-03:00",
    fecha: "Viernes 2 de octubre",
    hora: "21:00 hs",
    lugar: "Hilos Bar",
    direccion: "Juan Larrea 1518, B° General Paz",
    ciudad: "Córdoba",
    img: "assets/img/show-hilos.png?v=3",
    mapa: "https://maps.google.com/?q=Juan+Larrea+1518+Cordoba",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  renderShows();
  initPlayer();
  initGallery();
  initReveal();
  initCountdowns();
  if (window.lucide) lucide.createIcons();
});

/* ---------- Lenis smooth scroll ---------- */
if (window.Lenis) {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const el = document.querySelector(a.getAttribute("href"));
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -60 }); closeMenu(); }
    })
  );
}

/* ---------- nav + scroll progress ---------- */
const nav = document.getElementById("nav");
const scrollbar = document.getElementById("scrollbar");
addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", scrollY > 30);
  const h = document.documentElement.scrollHeight - innerHeight;
  scrollbar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
}, { passive: true });
const navLinks = document.getElementById("navLinks");
document.getElementById("navToggle").addEventListener("click", () => navLinks.classList.toggle("open"));
function closeMenu() { navLinks.classList.remove("open"); }

/* ---------- shows ---------- */
function renderShows() {
  const list = document.getElementById("showsList");
  const empty = document.getElementById("showsEmpty");
  if (!SHOWS.length) { empty.hidden = false; return; }

  list.innerHTML = SHOWS.map((s, i) => {
    const done = localStorage.getItem("rsvp:" + s.id);
    return `
    <article class="show" data-aos="fade-up" data-aos-delay="${i * 80}">
      <div class="show__imgwrap">
        ${i === 0 ? '<span class="show__tag">Próximo</span>' : ""}
        <img class="show__img" src="${s.img}" alt="${s.lugar} — ${s.fecha}" loading="lazy">
      </div>
      <div class="show__body">
        <div class="show__date"><i data-lucide="calendar"></i> ${s.fecha} · ${s.hora}</div>
        <div class="show__place">
          <h3>${s.lugar}</h3>
          <p><i data-lucide="map-pin"></i> ${s.direccion}, ${s.ciudad}</p>
        </div>
        <div class="show__cd" data-cd-target="${s.dt}">
          <div><b data-cd="d">00</b><span>días</span></div>
          <div><b data-cd="h">00</b><span>hs</span></div>
          <div><b data-cd="m">00</b><span>min</span></div>
          <div><b data-cd="s">00</b><span>seg</span></div>
        </div>
        <div class="show__count">
          <i data-lucide="users"></i>
          <div><b id="count-${s.id}" data-count>0</b><small>ya confirmaron su lugar</small></div>
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

function animateCount(el, to) {
  const from = Number(el.textContent) || 0;
  if (to === from) { el.textContent = to; return; }
  const start = performance.now(), dur = 900;
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function refreshCount(id) {
  try {
    const r = await fetch(`${WORKER}/count?show=${encodeURIComponent(id)}`);
    const d = await r.json();
    const el = document.getElementById("count-" + id);
    if (el) animateCount(el, d.people ?? 0);
  } catch { /* si el worker no responde, queda en 0 */ }
}

/* ---------- countdown (hero + cards) ---------- */
function initCountdowns() {
  const heroNext = document.getElementById("heroNext");
  const heroCd = document.getElementById("heroCountdown");
  const heroTarget = SHOWS.length ? new Date(SHOWS[0].dt).getTime() : 0;

  const pad = (n) => String(n).padStart(2, "0");
  const setBoxes = (root, ms) => {
    if (ms < 0) ms = 0;
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24,
      m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    const set = (k, v) => { const el = root.querySelector(`[data-cd="${k}"]`); if (el) el.textContent = v; };
    set("d", pad(d)); set("h", pad(h)); set("m", pad(m)); set("s", pad(s));
  };

  if (heroTarget) { heroNext.hidden = false; }

  const tick = () => {
    const now = Date.now();
    if (heroTarget) setBoxes(heroCd, heroTarget - now);
    document.querySelectorAll("[data-cd-target]").forEach((el) => {
      setBoxes(el, new Date(el.dataset.cdTarget).getTime() - now);
    });
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- modal RSVP ---------- */
const modal = document.getElementById("modal");
const rsvpForm = document.getElementById("rsvpForm");
const rsvpMsg = document.getElementById("rsvpMsg");
let currentShow = null;

function openModal(id) {
  currentShow = SHOWS.find((s) => s.id === id) || SHOWS[0];
  if (!currentShow) return;
  document.getElementById("modalShow").textContent = `${currentShow.lugar} · ${currentShow.fecha}`;
  rsvpMsg.textContent = ""; rsvpMsg.className = "rsvp__msg";
  rsvpForm.reset();
  modal.hidden = false;
  setTimeout(() => rsvpForm.querySelector("input")?.focus(), 60);
}
function closeModal() { modal.hidden = true; }
document.getElementById("modalClose").addEventListener("click", closeModal);
document.querySelectorAll("[data-rsvp-hero]").forEach((b) =>
  b.addEventListener("click", () => openModal(SHOWS[0]?.id))
);
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
      body: JSON.stringify({ show: currentShow.id, nombre: fd.get("nombre"), cantidad, tel: fd.get("tel") }),
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Error");

    localStorage.setItem("rsvp:" + currentShow.id, "1");
    const el = document.getElementById("count-" + currentShow.id);
    if (el) animateCount(el, Math.max(Number(d.people) || 0, (Number(el.textContent) || 0) + cantidad));
    const btnCard = document.querySelector(`[data-rsvp="${currentShow.id}"]`);
    if (btnCard) { btnCard.disabled = true; btnCard.innerHTML = '<i data-lucide="check"></i> Ya confirmaste'; }

    rsvpMsg.className = "rsvp__msg ok";
    rsvpMsg.textContent = "¡Listo! Te esperamos 🤘";
    if (window.lucide) lucide.createIcons();
    setTimeout(closeModal, 1700);
  } catch {
    rsvpMsg.className = "rsvp__msg err";
    rsvpMsg.textContent = "No se pudo confirmar. Probá de nuevo.";
  } finally {
    btn.disabled = false;
  }
});

/* ---------- player ---------- */
function initPlayer() {
  let current = null;
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };
  document.querySelectorAll(".track").forEach((el) => {
    const audio = new Audio();
    audio.preload = "none";
    audio.src = el.dataset.src;
    const btn = el.querySelector(".track__play");
    const prog = el.querySelector(".track__prog");
    const bar = el.querySelector(".track__bar");
    const time = el.querySelector(".track__time");
    const setIcon = (n) => { btn.innerHTML = `<i data-lucide="${n}"></i>`; if (window.lucide) lucide.createIcons(); };

    btn.addEventListener("click", () => {
      if (current && current.audio !== audio) {
        current.audio.pause(); current.el.classList.remove("playing"); current.setIcon("play");
      }
      if (audio.paused) { audio.play(); el.classList.add("playing"); setIcon("pause"); current = { audio, el, setIcon }; }
      else { audio.pause(); el.classList.remove("playing"); setIcon("play"); }
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) { prog.style.width = (audio.currentTime / audio.duration) * 100 + "%"; time.textContent = fmt(audio.duration - audio.currentTime); }
    });
    audio.addEventListener("ended", () => { el.classList.remove("playing"); setIcon("play"); prog.style.width = "0%"; });
    bar.addEventListener("click", (e) => {
      const rect = bar.getBoundingClientRect();
      if (audio.duration) audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  });
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = document.querySelectorAll("[data-aos]");
  els.forEach((el) => { const d = el.getAttribute("data-aos-delay"); if (d) el.style.transitionDelay = d + "ms"; });
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((el) => io.observe(el));
}

/* ---------- galería lightbox ---------- */
function initGallery() {
  const figs = [...document.querySelectorAll(".gallery .g img")];
  if (!figs.length) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.style.cssText = "position:fixed;inset:0;z-index:400;display:none;align-items:center;justify-content:center;background:rgba(6,4,4,.93);padding:24px;cursor:zoom-out;backdrop-filter:blur(4px)";
  const bimg = document.createElement("img");
  bimg.alt = "GRUPOP en vivo";
  bimg.style.cssText = "max-width:92vw;max-height:88vh;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.7)";
  box.appendChild(bimg);
  document.body.appendChild(box);
  const close = () => (box.style.display = "none");
  figs.forEach((im) => im.addEventListener("click", () => { bimg.src = im.src; box.style.display = "flex"; }));
  box.addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
