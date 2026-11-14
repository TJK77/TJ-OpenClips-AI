// Open editor entry page (/editor-start?entry=OpenEditor). Mirrors the live page: a full-screen editor shell with
// no video loaded yet (top bar, empty drop zone, AI enhance panel, tool rail, timeline bar). Nothing works until a
// video is added; every tool shows "Upload a video to try the editor". Adding a video creates an "edit" project
// (transcribed on the server) and then opens the normal clip editor.
import { $, $$, api, go, ic, esc, state, toast, popover } from './core.js';

const RAIL = [['sparkles', 'AI enhance'], ['cc', 'Captions'], ['cloudup', 'My library'], ['brandkit', 'Brand kit'], ['broll', 'B-roll'], ['hook', 'Hook'], ['trans', 'Transitions'], ['type', 'Text'], ['graphics', 'Graphics'], ['music', 'Audio']];
// [icon, label, toggle?]
const ENHANCE = [['filler', 'Remove filler words'], ['pauses', 'Remove pauses'], ['takes', 'Remove bad takes'], ['censor', 'Auto censor'], ['mic', 'Speech enhancement', 1], ['eye', 'Eye contact correction', 1], ['palette', 'Auto color correction', 1], ['hook', 'Auto viral hook'], ['broll', 'Auto B-roll'], ['translate', 'Video dubbing'], ['sfx', 'Auto generate voiceover hook'], ['emoji', 'AI emoji', 1], ['keywords', 'AI keywords highlighter', 1], ['trans', 'Auto transitions', 1], ['sfx', 'Auto sound effects', 1], ['zoom', 'Auto zoom', 1], ['type', 'Auto headline', 1], ['speakers', 'Speaker colors', 1]];
const LANGS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Dutch', 'Turkish'];
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}.00`;

export function renderEditorStart(app, url) {
  const projectId = url.searchParams.get('projectId');
  const me = state.me, initial = (me?.name || me?.user || 'D').trim()[0]?.toUpperCase() || 'D';
  app.innerHTML = `<div class="es">
  <header class="es-top"><div class="es-l"><button class="es-ib" id="es-back" aria-label="Back">${ic('arrowleft', 20)}</button><span class="es-name">New project</span></div>
    <div class="es-r"><button class="es-ib" disabled aria-label="Undo">${ic('undo', 18)}</button><button class="es-ib" disabled aria-label="Redo">${ic('redo', 18)}</button><button class="es-save" disabled>Save</button><button class="es-export" disabled>Export</button><button class="es-av" aria-label="Account">${esc(initial)}</button></div></header>
  <main class="es-main">
    <div class="es-stage"><div class="es-drop" id="es-drop"><div class="es-in" id="es-in"></div></div></div>
    <aside class="es-aside"><section class="es-panel"><h2>AI enhance</h2>${ENHANCE.map(([i, l, t]) => `<div class="es-row"><button data-need>${ic(i, 20)}<span>${l}</span></button>${t ? '<button class="es-sw" data-need aria-label="' + l + '"><span></span></button>' : ''}</div>`).join('')}</section>
    <nav class="es-nav">${RAIL.map(([i, l], n) => `<button class="${n ? '' : 'on'}" data-need>${ic(i, 22)}<span>${l}</span></button>`).join('')}</nav></aside>
  </main>
  <footer class="es-foot"><div class="es-fl"><button class="es-hide" data-need>${ic('doc', 16)}Hide timeline</button><button class="es-ib" data-need aria-label="Split">${ic('tlsplit', 18)}</button><button class="es-ib" data-need aria-label="Delete">${ic('trash', 18)}</button><button class="es-ib" data-need aria-label="Volume">${ic('audio', 18)}</button><button class="es-ib" data-need aria-label="Merge">${ic('tlmerge', 18)}</button></div>
    <div class="es-play"><button class="es-ib" data-need aria-label="Previous">${ic('skipprev', 16)}</button><button class="es-ib" data-need aria-label="Play">${ic('play', 18)}</button><button class="es-ib" data-need aria-label="Next">${ic('skipnext', 16)}</button><span class="es-tc">00:00.00 <i>/ 00:00.00</i></span></div>
    <div class="es-zoom">${ic('zoomout', 18)}<input type="range" min="0" max="100" value="40" aria-label="Zoom">${ic('zoomin', 18)}</div></footer></div>`;
  let src = null, language = 'English', tipT;
  $('#es-back').onclick = () => go('/dashboard');
  $('.es-av').onclick = () => go('/dashboard');
  const warn = () => { $$('.es-toast').forEach((t) => t.remove()); const t = Object.assign(document.createElement('div'), { className: 'es-toast', innerHTML: `${ic('alert', 16)}<span>Upload a video to try the editor</span>` }); document.body.append(t); setTimeout(() => t.remove(), 2600); };
  const need = () => $$('[data-need]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); if (!src && !projectId) warn(); }));
  need();

  const file = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' });
  const zone = $('#es-in');
  const empty = (err = '') => {
    zone.innerHTML = `<h1>Drop a video or paste a link</h1><div class="es-tool"><div class="es-tip" id="es-tip">Free Plan supports video link of YouTube only.</div><div class="es-link" id="es-linkbox">${ic('link', 18)}<input id="es-link" placeholder="Drop a YouTube link" autocomplete="off" spellcheck="false"></div></div>${err ? `<div class="es-err">${esc(err)}</div>` : ''}<div class="es-src"><button id="es-up">${ic('folder', 18)}Upload</button><button id="es-gd">${ic('drive', 18)}Google Drive</button></div>`;
    const inp = $('#es-link'), tip = $('#es-tip');
    inp.addEventListener('focus', () => tip.classList.add('on')); inp.addEventListener('blur', () => tip.classList.remove('on'));
    $('#es-linkbox').addEventListener('mouseenter', () => { tip.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => document.activeElement !== inp && tip.classList.remove('on'), 2200); });
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && fromLink(inp.value.trim()));
    inp.addEventListener('paste', () => setTimeout(() => /^https?:\/\//i.test(inp.value.trim()) && fromLink(inp.value.trim()), 0));
    $('#es-up').onclick = () => file.click();
    $('#es-gd').onclick = () => toast('Google Drive is not available in this demo.');
  };
  const busy = (msg) => { zone.innerHTML = `<div class="es-busy">${ic('refresh', 26, 'spin')}<span>${esc(msg)}</span></div>`; };
  const fromLink = async (v) => { if (!v) return; busy('Checking the link…'); try { const r = await api('/probe', { method: 'POST', body: { url: v } }); if (!r.ok) throw new Error(r.message); card(r); } catch (e) { empty(e.message); } };
  file.onchange = async () => { const f = file.files[0]; if (!f) return; busy('Uploading…'); try { card(await api(`/upload?name=${encodeURIComponent(f.name)}&size=${f.size}`, { method: 'POST', raw: state.me.engine === 'real' ? f : new Blob([]) })); } catch (e) { empty(e.message); } file.value = ''; };
  const card = (r) => {
    src = r; const mins = Math.max(1, Math.ceil(r.duration / 60));
    zone.innerHTML = `<div class="es-card"><div class="es-vid">${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="">` : ''}<div><b>${esc(r.title)}</b><span>${fmt(r.duration).slice(0, 5)} ${r.quality ? '· ' + esc(r.quality) : ''}</span></div><button class="es-ib" id="es-x" aria-label="Remove video">${ic('trash', 18)}</button></div>
    <div class="es-opts"><button class="es-dd" id="es-lang">Speech language: <b>${language}</b>${ic('down', 14)}</button></div><button class="es-open" id="es-open">Open in editor</button><div class="es-err" id="es-e"></div></div>`;
    $('#es-x').onclick = () => { src = null; empty(); };
    $('#es-lang').onclick = (e) => popover(e.currentTarget, LANGS.map((l) => ({ label: l, on: language === l })), { onPick: (it) => { language = it.label; card(src); } });
    $('#es-open').onclick = async (e) => { e.currentTarget.disabled = true; e.currentTarget.textContent = 'Starting…'; try { const p = await api('/projects', { method: 'POST', body: { kind: 'edit', source: src, options: { language } } }); go('/editor-start?entry=OpenEditor&projectId=' + p.id, true); } catch (er) { $('#es-e').textContent = er.message; e.currentTarget.disabled = false; e.currentTarget.textContent = 'Open in editor'; } };
  };
  const drop = $('#es-drop');
  ['dragover', 'dragenter'].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((n) => drop.addEventListener(n, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { file.files = e.dataTransfer.files; file.onchange(); } });

  if (projectId) {
    busy('Preparing your video…');
    const poll = async () => {
      if (!document.body.contains(drop)) return;
      try {
        const p = await api('/projects/' + projectId);
        if (p.status === 'completed') return go('/clip/' + projectId, true);
        if (p.status === 'failed') { zone.innerHTML = `<div class="es-busy"><span>${esc(p.error?.message || 'Processing failed')}</span></div><div class="es-src"><button id="es-retry">Try another video</button></div>`; $('#es-retry').onclick = () => go('/editor-start?entry=OpenEditor', true); return; }
        busy(`Preparing your video… ${Math.round((p.progress || 0) * 100)}%`);
      } catch {}
      setTimeout(poll, 1500);
    };
    poll();
  } else empty();
}
