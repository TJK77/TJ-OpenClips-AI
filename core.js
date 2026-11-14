import { FREE, PREMIUM_URL } from './edition.js';
import { ic, LOGO } from './icons.js';
export { ic, LOGO };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const state = { me: null };

export async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch('/api' + path, { method, headers: body && !raw ? { 'content-type': 'application/json' } : {}, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data?.message || 'Request failed'), { status: res.status, data });
  return data;
}

export function go(path, replace = false) { history[replace ? 'replaceState' : 'pushState']({}, '', path); window.dispatchEvent(new Event('route')); }

export function toast(msg, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), ms);
}

export function modal(html, { onClose } = {}) {
  const bg = document.createElement('div'); bg.className = 'modalbg';
  bg.innerHTML = `<div class="modal"><button class="x" aria-label="Close">${ic('close', 16)}</button>${html}</div>`;
  const close = () => { bg.remove(); onClose?.(); };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  $('.x', bg).onclick = close;
  document.body.append(bg);
  return { el: bg, close };
}
export function upgradeModal(what = 'This feature') {
  const m = modal(`<h3>Get Oclip Premium</h3><p>${esc(what)} is part of <b>Oclip Premium</b>. The Free version includes clipping, download and the clip editor. Get the Premium version to unlock this and every other feature.</p><div class="row"><button class="btn-dark" data-c>Maybe later</button><button class="btn-white" style="height:40px" data-p>Get Premium</button></div>`);
  $$('[data-c]', m.el).forEach((b) => (b.onclick = m.close));
  $('[data-p]', m.el).onclick = () => { if (PREMIUM_URL) window.open(PREMIUM_URL, '_blank', 'noopener'); m.close(); };
}

// popover anchored to an element. items: [{label, sub, on, value}] ; multi toggles checkboxes
export function popover(anchor, items, { multi = false, onPick, width, html } = {}) {
  $$('.pop').forEach((p) => p.remove());
  const pop = document.createElement('div'); pop.className = 'pop';
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.min(r.left, innerWidth - (width || 260) - 12) + 'px'; pop.style.top = r.bottom + 6 + 'px'; if (width) pop.style.width = width + 'px';
  {
    const draw = () => {
      pop.innerHTML = html ? html() : items.map((it, i) => `<div class="it" data-i="${i}"><span>${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${multi ? `<span class="cb ${it.on ? 'on' : ''}">${it.on ? ic('check', 12) : ''}</span>` : it.on ? ic('check', 16) : ''}</div>`).join('');
      $$('.it', pop).forEach((el) => (el.onclick = (e) => { e.stopPropagation(); const it = items[+el.dataset.i]; if (multi) { onPick(it, items); draw(); } else { onPick(it); pop.remove(); } }));
    };
    draw();
  }
  document.body.append(pop);
  const pr = pop.getBoundingClientRect(); if (pr.bottom > innerHeight - 8) pop.style.top = Math.max(8, r.top - pr.height - 6) + 'px';
  setTimeout(() => { const off = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', off); } }; document.addEventListener('mousedown', off); });
  return pop;
}

export const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
export const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
export const crown = () => (FREE ? '' : `<img class="crown" src="/img/crown.png" alt="">`);

export function topbar(extra = '') {
  const me = state.me;
  return `<div class="topbar"><button class="mnav" data-act="menu" aria-label="Menu">${ic('menu', 22)}</button>${extra}<button class="theme-tg" data-act="theme" aria-label="Switch light or dark theme" title="Switch light or dark theme">${ic('sun', 20, 't-sun')}${ic('moon', 20, 't-moon')}</button><button class="bell" aria-label="Notifications">${ic('bell', 22)}<b>${me?.notifications ?? 0}</b></button></div>`;
}
export const banner = () => '';
export const footer = () => `<div class="credit-foot">Developed by Robort Gabriel · coding180 · <a href="#" data-act="about">About</a></div>`;


const FORUM = 'https://coding180.com/forum', MORE = 'https://coding180.com/forum/reverse-engineer', CONTACT = 'https://coding180.com/contact';
const aboutHtml = () => {
  const real = state.me?.engine === 'real';
  const btn = (href, label, primary) => `<a class="btn-${primary ? 'white' : 'ghost'}" style="display:inline-block;margin:4px 6px 0 0;padding:8px 14px;border-radius:8px;text-decoration:none${primary ? '' : ';border:1px solid currentColor'}" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  return `<div style="max-height:70vh;overflow:auto"><h3>Oclip Free by coding180</h3>
<p>An independent, clean-room project built with the REA (reverse-engineer-anything) tool. It is not affiliated with or endorsed by the product it was modelled on. ${real ? 'This server transcribes, clips, reframes and captions your videos.' : 'Demo mode: processing is simulated and all sample clips are synthetic.'} This is the Free edition: clipping, download and the clip editor. Everything else needs Oclip Premium.</p>
<h4>Privacy</h4>
<p>Your projects and files stay on this computer. ${real ? 'To work, audio is sent to the speech-to-text service and the transcript to the AI model service the host configured (for example Groq and OpenRouter), and links are fetched by yt-dlp.' : 'In demo mode nothing leaves this server.'} Nothing is sent to coding180.</p>
<h4>Developer</h4>
<p>Hi, I'm <b>Robort Gabriel</b>, the developer behind <b>coding180</b>. I reverse-engineer apps and rebuild them from scratch so we can all see how they work, learn from them and make them better. Need changes or a version made for you? Contact me for modifications and personalization.</p>
<p>${btn(FORUM, 'Join the community forum', true)}${btn(MORE, 'More reverse-engineered tools')}${btn(CONTACT, 'Contact the developer')}</p></div>`;
};

export function bindGlobal(root) {
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'upgrade') { e.preventDefault(); upgradeModal('Watermark-free export'); }
    if (act === 'premium') { e.preventDefault(); upgradeModal(a.dataset.what || 'This feature'); }
    if (act === 'theme') { e.preventDefault(); window.clipTheme(); }
    if (act === 'menu') document.body.classList.toggle('nav-open');
    if (act === 'about') { e.preventDefault(); modal(aboutHtml()); }
  });
  root.addEventListener('click', (e) => {
    const l = e.target.closest('a[data-link]'); if (!l || e.metaKey || e.ctrlKey) return; e.preventDefault(); document.body.classList.remove('nav-open'); go(l.getAttribute('href'));
  });
}

// Features that are not part of this build show a short message.
export function upgradeOverlay(onDemo, what) { return upgradeModal(what || 'This feature'); }
