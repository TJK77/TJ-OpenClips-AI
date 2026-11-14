// Editor opened from "Open editor" (/editor-ux/:projectId?clipId=...). Layout follows the live editor: header with
// banner, chapter list on the left, canvas with a settings toolbar in the middle, tool rail on the right and a
// timeline with a filmstrip underneath. The edit model (trim, ratio, layout, captions, headline, deleted words) and
// the preview/export pipeline are the same ones the clip editor uses.
import { $, $$, api, go, ic, esc, state, toast, modal, popover, fmtTime, crown, upgradeModal } from './core.js';
import { CAPTIONS, exportModal, groupWords } from './flow.js';

const RAIL = [['sparkles', 'AI enhance', 1], ['cc', 'Captions'], ['cloudup', 'My library'], ['brandkit', 'Brand kit'], ['broll', 'B-roll'], ['hook', 'Hook'], ['trans', 'Transitions'], ['type', 'Text'], ['graphics', 'Graphics'], ['music', 'Audio']];
const ENHANCE = [['filler', 'Remove filler words'], ['pauses', 'Remove pauses'], ['takes', 'Remove bad takes'], ['censor', 'Auto censor'], ['mic', 'Speech enhancement', 1], ['eye', 'Eye contact correction', 1], ['palette', 'Auto color correction', 1], ['hook', 'Auto viral hook'], ['broll', 'Auto B-roll'], ['translate', 'Video dubbing'], ['sfx', 'Auto generate voiceover hook'], ['emoji', 'AI emoji', 1], ['keywords', 'AI keywords highlighter', 1], ['trans', 'Auto transitions', 1], ['sfx', 'Auto sound effects', 1], ['zoom', 'Auto zoom', 1], ['type', 'Auto headline', 1], ['speakers', 'Speaker colors', 1]];
const LAYOUTS = [['fill', 'Fill'], ['fit', 'Fit'], ['split', 'Split'], ['three', 'Three'], ['four', 'Four'], ['screenshare', 'ScreenShare'], ['gameplay', 'Gameplay']];
const RATIOS = ['16:9', '9:16', '1:1', '4:5'];
const clock = (s) => { s = Math.max(0, s); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 100)).padStart(2, '0')}`; };

// Group the transcript into chapters of about a minute that end on a sentence break. The title is the opening
// words of the chapter (there is no AI title step for an opened video).
function chapters(words, L) {
  const out = []; let cur = [];
  const flush = () => { if (!cur.length) return; const s = cur[0].s, e = cur.at(-1).e, text = cur.map((w) => w.w).join(' ').replace(/\s+/g, ' ').trim(); const t = text.split(' ').slice(0, 7).join(' ').replace(/[.,;:!?]+$/, ''); out.push({ s, e, from: cur[0].i, to: cur.at(-1).i, title: t.charAt(0).toUpperCase() + t.slice(1) + (text.split(' ').length > 7 ? '…' : ''), min: Math.max(1, Math.round((e - s) / 60)) }); cur = []; };
  words.forEach((w, i) => { cur.push({ ...w, i }); const len = w.e - cur[0].s; if ((len >= 55 && /[.!?]$/.test(w.w)) || len >= 110) flush(); });
  flush();
  if (!out.length) out.push({ s: 0, e: L, from: 0, to: -1, title: 'Full video', min: Math.max(1, Math.round(L / 60)) });
  return out;
}

export async function renderOpenEditor(app, pid, cid) {
  document.title = 'Editor | Oclip Free by coding180';
  app.innerHTML = `<div class="oe"><div class="oe-busy">${ic('refresh', 28, 'spin')}</div></div>`;
  let p; try { p = await api('/projects/' + pid); } catch (e) { app.innerHTML = `<div class="oe"><div class="oe-busy"><b>Could not load this video</b><span>${esc(e.message)}</span><button class="oe-btn" id="oe-bk">Back</button></div></div>`; $('#oe-bk').onclick = () => go('/dashboard'); return; }
  const clip = p.clips?.find((c) => c.id === cid) || p.clips?.[0];
  if (!clip) { app.innerHTML = `<div class="oe"><div class="oe-busy"><b>Video not found</b><button class="oe-btn" id="oe-bk">Back</button></div></div>`; $('#oe-bk').onclick = () => go('/projects'); return; }
  cid = clip.id;
  const e = clip.edit, L = clip.duration, me = state.me, initial = (me?.name || me?.user || 'D').trim()[0]?.toUpperCase() || 'D';
  let raw = clip.raw, vt = e.trim?.[0] || 0, playing = false, last = 0, saveT, dirty = false, groups = null, panel = null, zoom = 0, openCh = new Set(), scaleFit = 3;
  const loadRaw = async () => { if (p.engine !== 'real') return; try { const r = await api(`/projects/${pid}/clips/${cid}/raw`, { method: 'POST' }); if (r.src) raw = r; } catch { toast('Could not prepare the preview'); } };
  await loadRaw();
  const chs = chapters(clip.transcript, L);
  const save = (now) => { dirty = true; setDirty(); clearTimeout(saveT); const go_ = () => api(`/projects/${pid}/clips/${cid}`, { method: 'PATCH', body: { edit: e, transcript: clip.transcript, title: clip.title } }).then(() => { dirty = false; setDirty(); }).catch(() => toast('Could not save changes')); if (now) return go_(); saveT = setTimeout(go_, 700); };
  const setDirty = () => { const b = $('#oe-save'); if (b) { b.disabled = !dirty; b.classList.toggle('on', dirty); } };
  const relayout = async () => { clearTimeout(saveT); toast('Updating preview…'); try { await api(`/projects/${pid}/clips/${cid}`, { method: 'PATCH', body: { edit: e, transcript: clip.transcript, title: clip.title } }); await loadRaw(); dirty = false; } catch { toast('Could not save changes'); } draw(); };
  const cap = () => CAPTIONS.find((c) => c[0] === e.captionTemplate) || CAPTIONS[0];
  const seek = (t) => { vt = Math.min(L, Math.max(0, t)); const v = $('#v'); if (raw && v) v.currentTime = raw.offset + vt; tick(); };
  const scale = () => scaleFit * (1 + (zoom / 100) * 7);

  const draw = () => {
    const ratioCls = e.ratio === '1:1' ? 'r11' : e.ratio === '4:5' ? 'r45' : e.ratio === '9:16' ? 'r916' : 'r169';
    app.innerHTML = `<div class="oe">
    <header class="oe-head"><div class="oe-hl"><button class="oe-ib" id="oe-back" aria-label="Back">${ic('chevl', 18)}</button><span class="oe-title" title="${esc(clip.title)}">${esc(clip.title)}</span></div>
      <div class="oe-hr"><button class="oe-ib" disabled aria-label="Undo">${ic('undo', 18)}</button><button class="oe-ib" disabled aria-label="Redo">${ic('redo', 18)}</button><button class="oe-ib" id="oe-kbd" aria-label="Keyboard shortcuts">${ic('kbd', 18)}</button><button class="oe-save" id="oe-save" disabled>Save changes</button><button class="oe-export" id="oe-export">Export</button><button class="oe-av" aria-label="Account">${esc(initial)}</button></div></header>
    <div class="oe-ban"><div>${crown()}<span>Unlock watermark-free exports and make your content look pro.</span><button id="oe-up">Get Premium</button></div></div>
    <div class="oe-top">
      <section class="oe-left"><div class="oe-lt"><button class="oe-cleanup" data-soon>${ic('wand', 16)}Speech cleanup</button><div class="oe-lti"><button class="oe-ib" id="oe-find" aria-label="Search">${ic('search', 18)}</button><button class="oe-ib" data-soon aria-label="Select">${ic('listcheck', 18)}</button><button class="oe-ib" data-soon aria-label="Filter">${ic('filter', 18)}</button><button class="oe-ib" id="oe-dl" aria-label="Download transcript">${ic('download', 18)}</button></div></div>
        <div class="oe-find hidden" id="oe-findbox"><input id="oe-q" placeholder="Search the transcript" autocomplete="off"></div>
        <div class="oe-ext"><span>${ic('menu', 18)}</span><button data-soon>${ic('plus', 16)}Extend a clip</button></div>
        <div class="oe-chs" id="oe-chs">${chs.map((c, i) => `<div class="oe-ch ${openCh.has(i) ? 'open' : ''}" data-ch="${i}"><button class="oe-chh" data-chh="${i}"><b>${esc(c.title)}</b><small>${c.min} min</small>${ic('down', 18)}</button>${openCh.has(i) ? `<div class="oe-chw">${clip.transcript.slice(c.from, c.to + 1).map((w, k) => `<span class="word ${w.del ? 'del' : ''}" data-w="${c.from + k}">${esc(w.w)}</span>`).join(' ')}</div>` : ''}</div>`).join('')}</div></section>
      <section class="oe-mid"><div class="oe-opts"><button id="oe-ratio">${ic('ratio', 16)}${esc(e.ratio || '16:9')}</button><button id="oe-layout">${ic('trackic', 16)}Layout: ${esc((LAYOUTS.find((l) => l[0] === e.reframe) || LAYOUTS[0])[1])}</button><button data-soon>${ic('bgimg', 16)}Background</button><button data-soon>${ic('palette', 16)}Color correction: OFF ${crown()}</button><button data-soon>${ic('trackic', 16)}Tracker: OFF</button></div>
        <div class="oe-stage"><div class="oe-canvas ${ratioCls}" id="oe-canvas"><video id="v" ${raw ? `src="${esc(raw.src)}#t=${(raw.offset + vt).toFixed(2)}" preload="auto"` : `src="${clip.video}" poster="${clip.poster}" loop`} playsinline class="${e.reframe === 'fit' && !raw?.key ? 'fit' : ''}"></video>${e.headline ? `<div class="hl-ov" id="hlov">${esc(clip.title)}</div>` : ''}<div class="cap-ov ${cap()[2]}" id="capov"></div></div></div></section>
      <nav class="oe-rail">${RAIL.map(([i, l, dot], n) => `<button class="${panel === l ? 'on' : ''}" data-rail="${l}">${ic(i, 22)}${dot ? '<i></i>' : ''}<span>${l}</span></button>`).join('')}</nav>
      <section class="oe-panel ${panel ? '' : 'hidden'}" id="oe-panel">${panel ? panelHtml() : ''}</section>
    </div>
    <div class="oe-tl ${tlHidden ? 'collapsed' : ''}"><div class="oe-tbar"><div class="oe-tbl"><button class="oe-hide" id="oe-hide">${ic('doc', 16)}${tlHidden ? 'Show timeline' : 'Hide timeline'}</button><button class="oe-ib" data-soon aria-label="Split">${ic('tlsplit', 18)}</button><button class="oe-ib" data-soon aria-label="Link">${ic('link', 18)}</button><button class="oe-ib" data-soon aria-label="Delete">${ic('trash', 18)}</button><button class="oe-ib" data-soon aria-label="Volume">${ic('audio', 18)}</button><button class="oe-ib on" data-soon aria-label="Snap">${ic('tlmerge', 18)}</button></div>
      <div class="oe-play"><button class="oe-ib" id="oe-prev" aria-label="Back to start">${ic('skipprev', 16)}</button><button class="oe-ib" id="oe-pp" aria-label="Play">${ic('play', 18)}</button><button class="oe-ib" id="oe-next" aria-label="To the end">${ic('skipnext', 16)}</button><span class="oe-tc" id="oe-tc">00:00.00 <i>/</i> ${clock(L)}</span></div>
      <div class="oe-zoom"><i></i>${ic('zoomout', 18)}<input id="oe-z" type="range" min="0" max="100" value="${zoom}" aria-label="Zoom">${ic('zoomin', 18)}</div></div>
      <div class="oe-tracks" id="oe-tracks"><div class="oe-inner" id="oe-inner"><div class="oe-ruler" id="oe-ruler"></div><div class="oe-lane"><button class="oe-add" data-soon aria-label="Add before">${ic('plus', 20)}</button><div class="oe-strip" id="oe-strip"><div class="oe-lbl">${esc((LAYOUTS.find((l) => l[0] === e.reframe) || LAYOUTS[0])[1])}</div><div class="oe-film" id="oe-film"><div class="shade" id="s0"></div><div class="shade" id="s1"></div><div class="oe-h" id="h0">${ic('pause', 10)}</div><div class="oe-h r" id="h1">${ic('pause', 10)}</div></div><canvas class="oe-wave" id="oe-wave" height="40"></canvas></div><button class="oe-add" data-soon aria-label="Add after">${ic('plus', 20)}</button></div><div class="oe-ph" id="oe-ph"><i></i></div></div></div></div></div>`;
    wire(); sizeTimeline(); film(); tick();
  };
  let tlHidden = false;

  const panelHtml = () => {
    if (panel === 'AI enhance') return `<h2>AI enhance</h2>${ENHANCE.map(([i, l, t]) => `<div class="oe-row"><button data-soon>${ic(i, 20)}<span>${l}</span></button>${t ? `<button class="oe-sw" data-soon aria-label="${l}"><span></span></button>` : ''}</div>`).join('')}`;
    if (panel === 'Captions') return `<h2>Captions</h2><div class="oe-pb"><div class="rowtog"><button class="opt ${e.captions !== false ? 'on' : ''}" data-capon="1">On</button><button class="opt ${e.captions === false ? 'on' : ''}" data-capon="0">Off</button></div>${clip.translation ? `<h4>Caption language</h4><div class="rowtog"><button class="opt ${e.showTranslation !== false ? 'on' : ''}" data-tr="1">${esc(clip.translation.lang)}</button><button class="opt ${e.showTranslation === false ? 'on' : ''}" data-tr="0">Original</button></div>` : ''}<h4>Template</h4><div class="ptile">${CAPTIONS.map(([id, n, cl]) => `<div class="cap ${e.captionTemplate === id ? 'sel' : ''}" data-cap="${id}"><div class="pv"><span class="cap-ov ${cl}" style="position:static;font-size:14px">To get<br>started</span></div>${n}</div>`).join('')}</div><h4>Headline</h4><div class="rowtog"><button class="opt ${e.headline ? 'on' : ''}" data-hl="1">On</button><button class="opt ${!e.headline ? 'on' : ''}" data-hl="0">Off</button></div></div>`;
    return `<h2>${esc(panel)}</h2><div class="oe-pb"><p class="oe-na">${esc(panel)} is not available yet.</p></div>`;
  };

  // ---- timeline ----
  const sizeTimeline = () => {
    const box = $('#oe-tracks'); if (!box) return;
    scaleFit = Math.max(0.5, (box.clientWidth - 260) / L);
    const w = Math.round(L * scale()), inner = $('#oe-inner');
    inner.style.width = w + 260 + 'px'; $('#oe-strip').style.width = w + 'px';
    const steps = [1, 2, 5, 10, 20, 30, 60, 100, 200, 300, 600, 1200], step = steps.find((x) => x * scale() >= 90) || 1200, minor = step / 5;
    let h = ''; for (let t = 0; t <= L + 0.01; t += minor) { const x = Math.round(t * scale()); const big = Math.abs(t / step - Math.round(t / step)) < 0.001; h += big ? `<b style="left:${x}px">${Math.round(t)}</b>` : `<i style="left:${x}px"></i>`; }
    $('#oe-ruler').innerHTML = h;
    wave(); shades(); tick();
  };
  const shades = () => { const w = L * scale(); const s0 = $('#s0'), s1 = $('#s1'); if (!s0) return; $('#h0').style.left = (e.trim[0] / L) * w + 'px'; $('#h1').style.left = Math.max(14, (e.trim[1] / L) * w - 14) + 'px'; s0.style.cssText = `left:0;width:${(e.trim[0] / L) * w}px`; s1.style.cssText = `right:0;width:${(1 - e.trim[1] / L) * w}px`; };
  // A frame every ~80px, grabbed from the preview by a hidden video. Falls back to a plain strip.
  let filmToken = 0;
  const film = async () => {
    const holder = $('#oe-film'); if (!holder || !raw) return; const token = ++filmToken;
    const n = Math.max(6, Math.min(48, Math.round((L * scale()) / 78)));
    const frames = Array.from({ length: n }, () => Object.assign(document.createElement('img'), { alt: '' })); frames.forEach((f) => holder.insertBefore(f, holder.firstChild));
    const v = Object.assign(document.createElement('video'), { src: raw.src, muted: true, preload: 'auto', crossOrigin: 'anonymous' });
    const cv = document.createElement('canvas'); cv.width = 156; cv.height = 88; const ctx = cv.getContext('2d');
    try {
      await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = no; setTimeout(no, 15000); });
      for (let i = 0; i < n; i++) {
        if (token !== filmToken || !document.body.contains(holder)) return;
        await new Promise((ok) => { v.onseeked = ok; v.currentTime = raw.offset + Math.min(L - 0.1, ((i + 0.5) / n) * L); setTimeout(ok, 2500); });
        ctx.drawImage(v, 0, 0, cv.width, cv.height); frames[i].src = cv.toDataURL('image/jpeg', 0.6);
      }
    } catch { /* keep the plain strip */ }
  };
  // Speech is drawn as bars: tall where words are spoken, flat in pauses.
  const wave = () => {
    const c = $('#oe-wave'); if (!c) return; const W = Math.max(1, Math.round(L * scale())); c.width = W; c.style.width = W + 'px'; const g = c.getContext('2d'); g.clearRect(0, 0, W, 40); g.fillStyle = 'rgba(250,250,250,.38)';
    const ws = clip.transcript; let k = 0;
    for (let x = 0; x < W; x += 3) { const t = x / scale(); while (k < ws.length - 1 && ws[k].e < t) k++; const talk = ws[k] && ws[k].s <= t + 0.15 && ws[k].e >= t - 0.15, a = talk ? 8 + 12 * Math.abs(Math.sin(x * 0.7) * Math.cos(x * 0.31)) : 2; g.fillRect(x, 20 - a, 2, a * 2); }
  };

  // ---- playback and live captions ----
  const loop = (t) => {
    if (!playing) return; const dt = (t - last) / 1000; last = t; const v = $('#v');
    if (raw) { if (v && !v.seeking) vt = v.currentTime - raw.offset; } else vt += dt;
    if (vt >= e.trim[1] || vt < e.trim[0] - 0.25) seek(e.trim[0]); tick(); requestAnimationFrame(loop);
  };
  const tick = () => {
    const ph = $('#oe-ph'); if (!ph) return; ph.style.left = Math.round(116 + vt * scale()) + 'px'; $('#oe-tc').innerHTML = `${clock(vt)} <i>/</i> ${clock(L)}`;
    groups ??= groupWords(clip.transcript.filter((w) => !w.del));
    const ct = raw ? vt : vt % (groups.at(-1)?.at(-1).e || 1), simple = cap()[2] === 't-simple', word = (w) => esc(w.w.replace(/[.,;:]+$/, ''));
    const gi = groups.findIndex((g, k) => ct >= g[0].s - 0.05 && ct < Math.min(groups[k + 1]?.[0].s ?? Infinity, g.at(-1).e + 0.35)), g = gi < 0 || e.captions === false ? [] : groups[gi], cur = g.findLast((w) => w.s <= ct) || g[0];
    const tr = clip.translation && e.showTranslation !== false && e.captions !== false ? clip.translation.cues.find((c) => ct >= c.s && ct < c.e && !clip.transcript.slice(c.i0, c.i1 + 1).every((w) => w.del)) : null;
    const ov = $('#capov'); if (tr && ov) { ov.className = 'cap-ov t-simple'; ov.textContent = tr.text; } else if (ov) { ov.className = 'cap-ov ' + cap()[2]; ov.innerHTML = g.map((w) => (w === cur && !simple ? `<em>${word(w)}</em>` : word(w))).join(' '); }
    const hl = $('#hlov'); if (hl && raw) hl.style.display = vt - e.trim[0] < 5 ? '' : 'none';
    $$('.word').forEach((el) => el.classList.toggle('on', !tr && clip.transcript[+el.dataset.w] === cur));
  };

  const wire = () => {
    const v = $('#v'); playing = false;
    const setPlay = (on) => { playing = on; $('#oe-pp').innerHTML = ic(on ? 'pause' : 'play', 18); if (on) { if (vt >= e.trim[1] - 0.1) seek(e.trim[0]); v.play().catch(() => {}); last = performance.now(); requestAnimationFrame(loop); } else v.pause(); };
    $('#oe-pp').onclick = () => setPlay(!playing); v.onclick = () => setPlay(!playing);
    $('#oe-prev').onclick = () => seek(e.trim[0]); $('#oe-next').onclick = () => seek(Math.max(e.trim[0], e.trim[1] - 0.2));
    $('#oe-back').onclick = () => go('/projects');
    $('#oe-up').onclick = () => upgradeModal('Watermark-free export');
    $('#oe-kbd').onclick = () => modal(`<h3>Keyboard shortcuts</h3><p><b style="color:var(--fg)">Space</b> play or pause<br><b style="color:var(--fg)">Click the timeline</b> move the playhead<br><b style="color:var(--fg)">Drag the end handles</b> trim the video</p>`).el.querySelector('.modal').classList.add('sm');
    $('#oe-save').onclick = () => save(true);
    $('#oe-export').onclick = () => exportModal(pid, { ...clip, title: clip.title });
    $$('[data-soon]').forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); upgradeModal(b.textContent.trim().slice(0, 40) || 'This tool'); }));
    $('#oe-hide').onclick = () => { tlHidden = !tlHidden; draw(); };
    $('#oe-z').oninput = (ev) => { zoom = +ev.target.value; sizeTimeline(); film(); };
    $('#oe-ratio').onclick = (ev) => popover(ev.currentTarget, RATIOS.map((r) => ({ label: r, on: e.ratio === r })), { onPick: (it) => { e.ratio = it.label; relayout(); } });
    $('#oe-layout').onclick = (ev) => popover(ev.currentTarget, LAYOUTS.map(([k, l]) => ({ label: l, on: (e.reframe || 'fill') === k, k })), { onPick: (it) => { e.reframe = it.k; relayout(); } });
    $$('[data-rail]').forEach((b) => (b.onclick = () => { panel = panel === b.dataset.rail ? null : b.dataset.rail; $$('[data-rail]').forEach((x) => x.classList.toggle('on', x.dataset.rail === panel)); const pn = $('#oe-panel'); pn.classList.toggle('hidden', !panel); pn.innerHTML = panel ? panelHtml() : ''; panelWire(); }));
    $$('[data-chh]').forEach((b) => (b.onclick = () => { const i = +b.dataset.chh; openCh.has(i) ? openCh.delete(i) : openCh.add(i); const c = chs[i]; seek(c.s); draw(); }));
    $('#oe-find').onclick = () => { $('#oe-findbox').classList.toggle('hidden'); $('#oe-q').focus(); };
    $('#oe-q').oninput = (ev) => { const q = ev.target.value.trim().toLowerCase(); if (!q) return; const i = clip.transcript.findIndex((w) => w.w.toLowerCase().includes(q) && w.s >= vt - 0.01); const j = i < 0 ? clip.transcript.findIndex((w) => w.w.toLowerCase().includes(q)) : i; if (j < 0) return; const ci = chs.findIndex((c) => j >= c.from && j <= c.to); if (ci >= 0 && !openCh.has(ci)) { openCh.add(ci); const val = ev.target.value; draw(); $('#oe-findbox').classList.remove('hidden'); $('#oe-q').value = val; $('#oe-q').focus(); } seek(clip.transcript[j].s); };
    $('#oe-dl').onclick = () => { const txt = clip.transcript.filter((w) => !w.del).map((w) => w.w).join(' '); const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([txt], { type: 'text/plain' })), download: 'transcript.txt' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    // trim handles and scrubbing
    const strip = $('#oe-film'), toT = (cx) => ((cx - strip.getBoundingClientRect().left) / strip.getBoundingClientRect().width) * L;
    const dragH = (id, idx) => $(id).addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); const mv = (x) => { const t = Math.min(L, Math.max(0, toT(x.clientX))); if (idx === 0) e.trim[0] = Math.min(t, e.trim[1] - 3); else e.trim[1] = Math.max(t, e.trim[0] + 3); e.trim = e.trim.map((n) => +n.toFixed(1)); shades(); seek(idx === 0 ? e.trim[0] : Math.max(e.trim[0], e.trim[1] - 0.5)); }; const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); save(); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); });
    dragH('#h0', 0); dragH('#h1', 1);
    const scrub = (ev) => { if (ev.target.closest('.oe-h,.oe-add')) return; const mv = (x) => seek(Math.min(e.trim[1], Math.max(e.trim[0], toT(x.clientX)))); mv(ev); const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); };
    $('#oe-strip').addEventListener('mousedown', scrub); $('#oe-ruler').addEventListener('mousedown', scrub);
    $('#oe-chs').addEventListener('click', (ev) => { const w = ev.target.closest('[data-w]'); if (!w) return; const x = clip.transcript[+w.dataset.w]; x.del = !x.del; groups = null; w.classList.toggle('del', x.del); save(); tick(); });
    setDirty(); panelWire(); setDirty();
  };
  const panelWire = () => {
    $$('#oe-panel [data-soon]').forEach((b) => (b.onclick = () => upgradeModal(b.textContent.trim().slice(0, 40) || 'This tool')));
    $$('[data-tr]').forEach((el) => (el.onclick = () => { e.showTranslation = el.dataset.tr === '1'; save(); $('#oe-panel').innerHTML = panelHtml(); panelWire(); tick(); }));
    $$('[data-capon]').forEach((el) => (el.onclick = () => { e.captions = el.dataset.capon === '1'; save(); $('#oe-panel').innerHTML = panelHtml(); panelWire(); tick(); }));
    $$('[data-cap]').forEach((el) => (el.onclick = () => { e.captionTemplate = el.dataset.cap; save(); $$('[data-cap]').forEach((x) => x.classList.toggle('sel', x === el)); tick(); }));
    $$('[data-hl]').forEach((el) => (el.onclick = () => { e.headline = el.dataset.hl === '1'; save(); draw(); }));
  };
  const key = (ev) => { if (!document.body.contains($('#oe-pp'))) return removeEventListener('keydown', key); if (ev.code === 'Space' && !/INPUT|TEXTAREA/.test(ev.target.tagName)) { ev.preventDefault(); $('#oe-pp').click(); } };
  addEventListener('keydown', key);
  addEventListener('resize', () => document.body.contains($('#oe-tracks')) && sizeTimeline());
  draw();
  // first visit: a short welcome
  try { if (!sessionStorage.getItem('oeWelcome')) { sessionStorage.setItem('oeWelcome', '1'); const m = modal(`<h3>Welcome to the editor</h3><p>Edit your video in one place: trim it on the timeline, switch the aspect ratio and layout, style the captions and remove words from the transcript. Pick a tool on the right to get started.</p><div class="row"><button class="btn-dark" data-c>Skip</button><button class="btn-white" style="height:40px" data-c>Get started</button></div>`); m.el.querySelector('.modal').classList.add('sm'); $$('[data-c]', m.el).forEach((b) => (b.onclick = m.close)); } } catch {}
}
