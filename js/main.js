/* ============================================================
   Barbearia RickGino — main.js
   Utilitários, ícones, renderização das secções do site público,
   animações, toasts e wiring do sistema de marcação.
   ============================================================ */

"use strict";

(function () {
  /* ---------- Utilidades ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (str) =>
    String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const initials = (name = "") =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const fmtPrice = (v) => `${v}€`;

  const pad = (n) => String(n).padStart(2, "0");

  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const addDays = (d, n) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  };

  const parseISO = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  /* ---------- Ícones (inline SVG, sem bibliotecas) ---------- */
  const I = {
    scissors:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>',
    razor:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3 21 7l-9 9-4 1 1-4z"/><path d="m12 12 4-4"/><path d="M3 20h18"/></svg>',
    steam:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M6 2v3M3 5h6M5 10H3"/></svg>',
    brow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c3-2.6 7-2.6 10 0 1.4 1.2 3.8 1.4 8-.4"/><path d="M3 17c4-2.4 8-2.4 12 0l6 2"/></svg>',
    clip:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2"/><path d="M3 21c0-4.5 2.2-8.6 5.3-10.7L14 16c-2.1 3.1-6.2 5.3-10.7 5.3H3z"/><path d="m9.5 9.5 5 5"/><path d="M15 3h6l-1 5-5-5z"/></svg>',
    color:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7S5.5 9.2 5.5 14a6.5 6.5 0 0 0 13 0c0-4.8-6.5-11.3-6.5-11.3z"/><path d="M5 18c-1 .5-1.5 1.5-1.5 3h17c0-1.5-.5-2.5-1.5-3"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18"/></svg>',
    calendarCheck:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18M9 16.5l2 2 4-4.5"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    arrowRight:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    user:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    history:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>',
    layout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v4"/></svg>',
    alert:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    calendarX:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 9h18M10 15l4 4M14 15l-4 4"/></svg>',
    google:
      '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 16.09 2 19.92 2 24s.85 7.91 2.34 11.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75z"/></svg>',
  };
  window.RG = { $, $$, esc, initials, fmtPrice, toISODate, addDays, parseISO, pad, I };
  window.RGICONS = I;

  /* ---------- Toasts ---------- */
  function showToast(msg, type = "success") {
    let wrap = $("#toastWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toastWrap";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    const icon = type === "error" ? I.alert : type === "info" ? I.info : I.check;
    t.innerHTML = `<span class="t-ic">${icon}</span><p>${esc(msg)}</p>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 500);
    }, 3800);
  }
  window.showToast = showToast;

  /* ---------- Header / navegação ---------- */
  function initHeader() {
    const header = $(".site-header");
    const burger = $("#burger");
    const mobileNav = $("#mobileNav");

    const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (burger && mobileNav) {
      burger.addEventListener("click", () => {
        const open = mobileNav.classList.toggle("open");
        burger.classList.toggle("open", open);
        document.body.style.overflow = open ? "hidden" : "";
      });
      $$("a", mobileNav).forEach((a) =>
        a.addEventListener("click", () => {
          mobileNav.classList.remove("open");
          burger.classList.remove("open");
          document.body.style.overflow = "";
        })
      );
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((e) => io.observe(e));
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    const track = $(".marquee-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
  }

  /* ---------- Renderização das secções ---------- */
  const D = window.SITE_DATA;

  function renderServices() {
    const grid = $("#servicesGrid");
    if (!grid || !D) return;
    grid.innerHTML = D.services
      .map(
        (s, i) => `
      <article class="service-card reveal" style="--d:${(i % 4) * 0.06}s">
        <div class="service-top">
          <span class="service-icon">${I[s.icon] || I.scissors}</span>
          <span class="service-price">${s.price}<small>€</small></span>
        </div>
        <h3>${esc(s.name)}</h3>
        <p class="service-desc">${esc(s.desc || "")}</p>
        <div class="service-foot">
          <span class="service-dur">${I.clock}${s.duration} min</span>
          <button class="service-book" data-book="${esc(s.id)}">Marcar ${I.arrowRight}</button>
        </div>
      </article>`
      )
      .join("");
  }

  function renderTeam() {
    const grid = $("#teamGrid");
    if (!grid || !D) return;
    grid.innerHTML = D.team
      .map(
        (t) => `
      <article class="team-card reveal">
        <div class="team-photo">
          ${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy">` : `<span class="initials">${initials(t.name)}</span>`}
        </div>
        <div class="team-body">
          <h3>${esc(t.name)}</h3>
          <span class="team-role">${esc(t.role)}</span>
          <p class="team-spec">${esc(t.specialty)}</p>
          <p class="team-desc">${esc(t.description)}</p>
          <button class="btn btn-outline btn-sm team-book" data-book data-barber="${esc(t.id)}">Marcar com ${esc(t.name.split(" ")[0])}</button>
        </div>
      </article>`
      )
      .join("");
  }

  function renderGallery() {
    const grid = $("#galleryGrid");
    if (!grid || !D) return;
    const tall = [0, 3, 5];
    grid.innerHTML = D.gallery
      .map(
        (g, i) => `
      <figure class="gallery-item reveal ${tall.includes(i) ? "g-tall" : ""} ${i === 1 ? "g-wide" : ""}" data-src="${esc(g.src)}">
        <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy">
      </figure>`
      )
      .join("");
    initLightbox();
  }

  function initLightbox() {
    const lb = $("#lightbox");
    if (!lb) return;
    const img = $("#lightboxImg", lb);
    $$(".gallery-item").forEach((item) =>
      item.addEventListener("click", () => {
        img.src = item.dataset.src;
        lb.classList.add("open");
        document.body.style.overflow = "hidden";
      })
    );
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.closest(".lightbox-close")) {
        lb.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  }

  function renderReviews() {
    const grid = $("#reviewsGrid");
    if (!grid || !D) return;
    grid.innerHTML = D.testimonials
      .map(
        (r, i) => `
      <blockquote class="review-card reveal" style="--d:${(i % 2) * 0.08}s">
        <span class="quote-mark">&ldquo;</span>
        <span class="stars-sm">${I.star.repeat(5)}</span>
        <p>${esc(r.text)}</p>
        <footer class="review-user">
          <span class="review-avatar">${initials(r.name)}</span>
          <div><b>${esc(r.name)}</b><span>${esc(r.service)}</span></div>
        </footer>
      </blockquote>`
      )
      .join("");
  }

  function renderHours() {
    const list = $("#hoursList");
    if (!list || !D || !D.schedule) return;
    const days = [
      ["monday", "Segunda"],
      ["tuesday", "Terça"],
      ["wednesday", "Quarta"],
      ["thursday", "Quinta"],
      ["friday", "Sexta"],
      ["saturday", "Sábado"],
      ["sunday", "Domingo"],
    ];
    const todayIdx = (new Date().getDay() + 6) % 7;
    list.innerHTML = days
      .map(([k, label], i) => {
        const val = D.schedule[k] || "";
        const closed = /encerr/i.test(val);
        return `<li class="${i === todayIdx ? "" : ""}" ${i === todayIdx ? 'style="color:var(--gold)"' : ""}>
          <span class="day">${label}${i === todayIdx ? " · Hoje" : ""}</span>
          <span class="time ${closed ? "closed" : ""}">${esc(val)}</span>
        </li>`;
      })
      .join("");
    const note = $("#hoursNote");
    if (note) note.innerHTML = `${I.info}<span>${esc(D.schedule.note || "")}</span>`;
  }

  function renderFooter() {
    const f = $("#footerDynamic");
    if (!f || !D) return;
    const b = D.business;
    f.innerHTML = `
      <div class="footer-brand">
        <a href="#top" class="brand">
          <span class="brand-mark">${I.scissors}</span>
          <span><span class="brand-name">Barbearia <em>RickGino</em></span></span>
        </a>
        <p>${esc(b.description)}</p>
        <div class="footer-social">
          <a href="${esc(b.instagramUrl)}" target="_blank" rel="noopener" aria-label="Instagram">${I.instagram}</a>
          <a href="https://wa.me/${esc(b.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.phone}</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Navegação</h4>
        <ul>
          ${D.nav.map((n) => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join("")}
          <li><a href="#marcacao" data-book>Marcar</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contacto</h4>
        <ul>
          <li><a href="tel:${esc(b.phoneTel)}">${esc(b.phoneDisplay)}</a></li>
          <li><a href="${esc(b.instagramUrl)}" target="_blank" rel="noopener">${esc(b.instagramHandle)}</a></li>
          <li><span>${esc(b.addressLine1)}, ${esc(b.addressLine2)}</span></li>
          <li><a href="#localizacao">Como chegar</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Horário</h4>
        <ul>
          <li><span>Seg – Sáb</span></li>
          <li><span style="color:var(--gold)">09:00 – 19:00</span></li>
          <li><span>Domingo · Encerrado</span></li>
          <li style="margin-top:10px"><a href="#marcacao" class="btn btn-gold btn-sm" data-book>Marcar agora</a></li>
        </ul>
      </div>`;
  }

  function renderHero() {
    const b = D.business;
    const hero = document.querySelector(".hero-bg");
    if (hero && b.heroImage) hero.style.backgroundImage = `url('${esc(b.heroImage)}')`;
    const aboutImg = document.querySelector(".about-img img");
    if (aboutImg && b.aboutImage) aboutImg.src = b.aboutImage;
    const aboutAlt = document.querySelector(".about-img img");
    if (aboutAlt) aboutAlt.alt = b.name;

    // SEO dinâmico (canonical + OG)
    if (b.siteUrl) {
      const link = document.querySelector('link[rel="canonical"]');
      if (link) link.href = b.siteUrl;
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.content = b.siteUrl;
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && b.heroImage) ogImg.content = b.heroImage;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.content = `${b.name} — ${b.tagline} · ${b.city}`;
    }
  }

  function renderHeroMeta() {
    const b = D.business;
    const el = $("#heroMeta");
    if (el)
      el.innerHTML = `
        <div class="hm"><b>${esc(b.googleStars)} <span style="color:var(--gold)">★</span></b><span>${esc(b.googleReviews)} avaliações Google</span></div>
        <div class="hm"><b>${esc(b.phoneDisplay)}</b><span>Marca por telefone</span></div>
        <div class="hm"><b>${esc(b.city)}, Portugal</b><span>${esc(b.addressLine2)}</span></div>`;
  }

  function renderCTA() {
    const c = $("#ctaBand");
    if (!c || !D) return;
    const img = D.gallery[0].src;
    c.innerHTML = `
      <div class="cta-bg" style="background-image:url('${esc(img)}')"></div>
      <div class="container reveal">
        <h2>Pronto para o teu <em>próximo</em> corte?</h2>
        <p>Reserva em segundos. Escolhe o serviço, o barbeiro e o horário que preferes.</p>
        <a href="#marcacao" class="btn btn-gold btn-lg" data-book>Marcar agora ${I.arrowRight}</a>
      </div>`;
  }

  /* ---------- Counters (stats) ---------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = parseFloat(el.dataset.count);
          const dec = parseInt(el.dataset.decimals || "0", 10);
          const dur = 1400;
          const start = performance.now();
          const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = (target * eased).toFixed(dec);
            el.textContent = dec > 0 ? val.replace(".", ",") : val;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          io.unobserve(el);
        }),
      { threshold: 0.4 }
    );
    els.forEach((e) => io.observe(e));
  }

  /* ---------- Wiring do botão de marcação ---------- */
  function initBookingTriggers() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-book]");
      if (!btn) return;
      e.preventDefault();
      if (window.BookingFlow) {
        window.BookingFlow.open({ serviceId: btn.dataset.book, barberId: btn.dataset.barber });
      }
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    if (D) {
      renderHero();
      renderServices();
      renderTeam();
      renderGallery();
      renderReviews();
      renderHours();
      renderFooter();
      renderHeroMeta();
      renderCTA();
    }
    initHeader();
    initReveal();
    initMarquee();
    initCounters();
    initBookingTriggers();
  });
})();
