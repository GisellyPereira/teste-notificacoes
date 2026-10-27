import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 860px)').matches;

/* ---------------- Scroll suave ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const menu = $('.mobile-menu');
const burger = $('.nav__burger');
const setMenu = (open) => {
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  document.documentElement.style.overflow = open ? 'hidden' : '';
  open ? lenis?.stop() : lenis?.start();
};
burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const t = id.length > 1 && $(id);
  if (!t) return;
  e.preventDefault();
  setMenu(false);
  lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------------- Utilidades de texto ---------------- */
function words(el) {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
}
function lines(el) {
  el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l) => `<span class="line-mask"><span>${l.trim()}</span></span>`).join('');
  return $$('.line-mask > span', el);
}

/* ---------------- Nav ---------------- */
const nav = $('[data-nav]');
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', self.direction === 1 && y > 300 && !menu.classList.contains('is-open'));
  },
});
$$('.clients, .modules').forEach((sec) => ScrollTrigger.create({
  trigger: sec, start: 'top 36px', end: 'bottom 36px',
  onToggle: (s) => nav.classList.toggle('is-light', s.isActive),
}));

/* ---------------- 1. Hero ---------------- */
const heroWords = words($('[data-reveal-words]'));
const heroImg = $('[data-hero-media] img');
ScrollTrigger.create({
  trigger: '[data-hero]', start: 'top top', end: 'bottom bottom', scrub: true,
  onUpdate: (s) => {
    const p = s.progress;
    // palavras acendem entre 5% e 65% do trecho
    const n = Math.round(clamp((p - 0.05) / 0.6, 0, 1) * heroWords.length);
    heroWords.forEach((w, i) => w.classList.toggle('on', i < n));
    if (!reduced) heroImg.style.transform = `scale(${1 + p * 0.18})`;
    $('[data-hero-shade]').style.background = `linear-gradient(180deg, rgba(7,9,11,${0.45 + p * 0.3}) 0%, rgba(7,9,11,${p * 0.6}) 35%, rgba(7,9,11,${p * 0.6}) 55%, rgba(7,9,11,${0.75 + p * 0.25}) 100%)`;
    // escurece de vez no final para emendar com o 3D
    const fade = clamp((p - 0.78) / 0.22, 0, 1);
    $('.hero__sticky').style.opacity = String(1 - fade * 0.92);
    $('[data-hero-scroll]').style.opacity = String(1 - clamp(p / 0.08, 0, 1));
  },
});
if (reduced) heroWords.forEach((w) => w.classList.add('on'));
gsap.from(['[data-hero-eyebrow]', '[data-reveal-words]'], { opacity: 0, y: 24, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.2, clearProps: 'all' });
gsap.from(heroImg, { scale: 1.12, duration: 2.2, ease: 'expo.out' });

/* ---------------- 2. Pátio 3D ---------------- */
const yardCanvas = $('[data-yard-canvas]');
const labelsBox = $('[data-yard-labels]');
let yard = null;
let labelEls = [];
// O 3D (Three.js) é carregado à parte, sem atrasar o hero
import('./yard.js').then(({ createYard }) => {
  try {
    yard = createYard(yardCanvas, { mobile });
    labelEls = yard.labels.map((d) => {
      const el = document.createElement('div');
      el.className = 'tag';
      el.innerHTML = `${d.text} <small>${d.sub}</small>`;
      labelsBox.appendChild(el);
      return el;
    });
  } catch (err) {
    // sem WebGL: mostra uma foto do pátio no lugar do 3D
    $('[data-yard]').classList.add('yard--fallback');
  }
});
const yardLines = $$('[data-yard-line]');
const lineWindows = [[0.04, 0.3], [0.36, 0.62], [0.7, 0.97]];
const hud = { vehicles: $('[data-hud="vehicles"]'), docks: $('[data-hud="docks"]'), time: $('[data-hud="time"]') };
const progressBar = $('[data-yard-progress]');
let yardProgress = 0;
let yardVisible = false;

ScrollTrigger.create({
  trigger: '[data-yard]', start: 'top top', end: 'bottom bottom', scrub: true,
  onUpdate: (s) => { yardProgress = s.progress; },
});
new IntersectionObserver(([e]) => { yardVisible = e.isIntersecting; }, { rootMargin: '200px' }).observe($('[data-yard]'));
addEventListener('resize', () => yard?.resize());

let smooth = 0;
gsap.ticker.add(() => {
  if (!yardVisible) return;
  smooth += (yardProgress - smooth) * (reduced ? 1 : 0.12);
  const p = smooth;
  yard?.render(p, labelEls);
  yardLines.forEach((el, i) => {
    const [a, b] = lineWindows[i];
    const fadeIn = clamp((p - a) / 0.07, 0, 1);
    const fadeOut = i === yardLines.length - 1 ? 1 : 1 - clamp((p - (b - 0.07)) / 0.07, 0, 1);
    const o = Math.min(fadeIn, fadeOut);
    el.style.opacity = String(o);
    el.style.transform = `translateY(${(1 - o) * 30}px)`;
    el.style.filter = `blur(${(1 - o) * 8}px)`;
  });
  const t = performance.now() / 1000;
  hud.vehicles.textContent = String(Math.round(118 + p * 24 + Math.sin(t) * 2));
  hud.docks.textContent = `${Math.min(16, Math.round(9 + p * 7))}/16`;
  const secs = Math.round(41 * 60 - p * (41 - 12.5) * 60);
  hud.time.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  progressBar.style.transform = `scaleY(${p})`;
});

/* ---------------- Revelações ---------------- */
$$('[data-split]').forEach((el) => {
  const ls = lines(el);
  gsap.from(ls, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
});
$$('[data-fade]').forEach((el) => gsap.from(el, { y: 24, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
gsap.from('[data-card]', { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.mods', start: 'top 85%' } });
gsap.from('.stat', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.stats', start: 'top 88%' } });

// Logos: duas faixas em sentidos opostos, aceleram com o scroll
$$('[data-logo-row]').forEach((row, i) => {
  row.innerHTML += row.innerHTML;
  const dir = row.classList.contains('logos__row--rev') ? 1 : -1;
  const tw = gsap.fromTo(row, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: 38 + i * 6, ease: 'none', repeat: -1 });
  if (reduced) tw.pause();
});
ScrollTrigger.create({
  trigger: '.clients', start: 'top bottom', end: 'bottom top',
  onUpdate: (s) => {
    const v = clamp(Math.abs(s.getVelocity()) / 600, 0, 4);
    gsap.getTweensOf($$('[data-logo-row]')).forEach((t) => gsap.to(t, { timeScale: 1 + v, duration: 0.3, overwrite: true }));
  },
});

// Destaques que mudam nos cards de módulos (pátio e docas)
setInterval(() => {
  $$('.mod__viz .grid rect, .mod__viz .docks rect').forEach((r) => { if (Math.random() < 0.25) r.classList.toggle('on'); });
}, 1400);

// Parallax da foto de resultados
if (!reduced) gsap.fromTo('.results__bg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.results', start: 'top bottom', end: 'bottom top', scrub: true } });

// Contadores
$$('[data-counter]').forEach((el) => {
  const end = parseFloat(el.dataset.counter);
  const dec = parseInt(el.dataset.decimals || '0', 10);
  const o = { v: 0 };
  const fmt = (v) => v.toFixed(dec).replace('.', ',');
  if (reduced) { el.textContent = fmt(end); return; }
  gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = fmt(o.v); } });
});

addEventListener('load', () => ScrollTrigger.refresh());
