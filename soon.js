// Oclip Free: features that are not built or not included stay visible; clicking one offers Oclip Premium.
import { upgradeModal } from './core.js';
const SOON = [
  '.chip',
  '.nav a:not([href="/dashboard"]):not([href="/projects"])',
  '.bell', '.btn-add.up', '.btn-add[data-act="credits"]', '.banner', '.support', '.rmw', '.searchbox', '.pill',
  '.coll .add', '[data-sched]', '[data-pub]', '[data-xml]', '[data-up]', '[data-ai]', '[data-dup]', '[data-ratio]', '#sel', '#flt', '#upl',
  '.tile', '[data-dd="picks"]', '[data-dd="dub"]', 
  '[data-sw="emojis"]', '[data-sw="broll"]', '[data-sw="speech"]', '[data-sw="enhance"]', '[data-sw="sfx"]', '[data-sw="zoom"]', '[data-sw="trans"]', '[data-sw="color"]', '[data-sw="dub"]',
];
const BY_TEXT = [
  ['.srcbtn', /Google Drive/],
  ['.row-set', /Motion graphics|AI Emojis|Auto B-roll|AI video B-roll|Speech cleanup|Enhance audio|Auto SFX|Auto Zoom|Auto transitions|Auto Color Correction|Voice dubbing/],
];
const SEL = SOON.join(',');
function mark(el) {
  if (el.classList.contains('is-soon')) return;
  el.classList.add('is-soon'); el.setAttribute('aria-disabled', 'true'); el.setAttribute('title', 'Oclip Premium'); if (el.matches('a,button,input')) el.setAttribute('tabindex', '-1');
}
let queued = false;
function scan() {
  queued = false;
  document.querySelectorAll(SEL).forEach(mark);
  for (const [sel, re] of BY_TEXT) document.querySelectorAll(sel).forEach((el) => { if (re.test(el.textContent)) mark(el); });
}
const stop = (e) => { const t = e.target.closest && e.target.closest('.is-soon'); if (t) { e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'click') upgradeModal(t.dataset.prem || t.getAttribute('aria-label') || t.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) || 'This feature'); } };
export function initSoon() {
  ['click', 'mousedown', 'keydown'].forEach((ev) => document.addEventListener(ev, (e) => { if (ev === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; stop(e); }, true));
  new MutationObserver(() => { if (!queued) { queued = true; setTimeout(scan, 30); } }).observe(document.body, { childList: true, subtree: true });
  scan();
}
