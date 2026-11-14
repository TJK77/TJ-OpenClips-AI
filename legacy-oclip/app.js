import { ic, LOGO, esc, $, $$, state, api, go, toast, modal, upgradeModal, popover, crown, topbar, banner, footer, bindGlobal, fmtDate } from './core.js';
import { FREE, PREMIUM_URL } from './edition.js';
import { initSoon } from './soon.js';
import { renderEditorStart } from './editorstart.js';
import { renderOpenEditor } from './openeditor.js';
import { renderPresets, renderProject, renderEditor, CAPTIONS } from './flow.js';

const app = $('#app');
initSoon();
bindGlobal(document);

const NAV = [
  ['Create', [['/dashboard', 'Home', 'home'], ['/projects', 'My projects', 'projects'], ['/brand-kits#kit', 'Brand style', 'brandkit', { crown: 1, dot: 1, to: '/brand-kits' }], ['/brand-kits', 'Asset library', 'library']]],
];
const PLACEHOLDERS = ['Rumble', 'Zoom', 'YouTube', 'Vimeo', 'Twitch', 'Google Drive'];

function shell(inner, path, { wide = false } = {}) {
  const items = NAV.map(([label, links], gi) => `${label ? `<div class="sb-label">${label}</div>` : '<div style="height:26px"></div>'}<div class="nav">${links.map(([href, text, icon, o = {}]) => `<a href="${FREE && href.startsWith('/brand-kits') ? '#' : (o.to || href)}" ${FREE && href.startsWith('/brand-kits') ? `data-act="premium" data-what="${text}"` : 'data-link'} class="${(o.to || href).split('#')[0] === path ? 'on' : ''}">${ic(icon, 20)}${o.dot ? '<i class="dot"></i>' : ''}<span>${text}</span>${o.crown ? crown() : ''}</a>`).join('')}</div>`).join('');
  return `<aside class="sidebar"><div class="sb-top"><a href="/dashboard" data-link class="logo">${LOGO(28)}<span class="wm">Oclip<small>Free · by coding180</small></span></a><button class="sb-collapse" aria-label="Collapse sidebar">${ic('collapse', 18)}</button></div>
  <div class="acct"><div class="avatar">${esc(state.me.name[0] || 'Y')}</div><div class="grow"><div class="nm">${esc(state.me.name)}</div></div></div>
  ${items}<div class="sb-grow"></div><a class="sb-premium" href="${PREMIUM_URL}" target="_blank" rel="noopener noreferrer">${ic('bolt', 18)}<span>Get Premium</span></a></aside>
  <div class="main" id="main">${topbar()}${banner()}${inner}</div><button class="support" aria-label="Support">${ic('headset', 22)}</button>`;
}

// ---------- pages ----------
const tabOf = (type) => (type === 'auto-edit-footage' ? 'auto' : type === 'open-editor' ? 'edit' : 'clip');
const LANGS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Dutch', 'Turkish'];

function dashboard(path, type) {
  const tab = tabOf(type);
  const box = tab === 'clip'
    ? `<div class="box" id="box"><div class="linkrow">${ic('link', 18)}<input id="link" placeholder="Drop a ${PLACEHOLDERS[0]} link" autocomplete="off" spellcheck="false"></div><div id="lerr"></div><div class="srcrow"><button class="srcbtn" id="up" title="Video to 10GB, maximum duration of 10 hours (mp4, mov, webm)">${ic('folder', 18)}Upload</button><button class="srcbtn" id="gd">${ic('drive', 18)}Google Drive</button></div><button class="btn-white" id="go">Get clips in 1 click</button></div>`
    : `<div class="box r0"><div class="drop" id="drop"><div class="t">Drag and drop a video or <button class="btn-white" id="choose" style="display:inline-flex;height:34px;font-size:14px;margin-left:6px;border-radius:8px">Choose video ${ic('down', 14)}</button></div><div style="font-size:13px;color:var(--muted)">${tab === 'edit' ? 'Open any video in the editor: <span style="margin-left:8px">' + ic('scissors', 14) + ' Trim</span> <span style="margin-left:10px">' + ic('cc', 14) + ' Captions</span> <span style="margin-left:10px">' + ic('crop', 14) + ' Reframe</span> <span style="margin-left:10px">' + ic('type', 14) + ' Headline</span>' : 'Polish video with: <span style="margin-left:8px">' + ic('cc', 14) + ' Caption</span> <span style="margin-left:10px">' + ic('broll', 14) + ' B-roll</span> <span style="margin-left:10px">' + ic('speech', 14) + ' Speech cleanup</span> <span style="margin-left:10px">' + ic('type', 14) + ' Headline</span>'}</div></div></div>`;
  const chips = [['Preset templ…', null, 'preset'], null, ['Clean up recording', 'clean', 0, 1], ['Auto-edit talking videos', 'talk', 0, 1], ['Captions', 'cc'], ['Reframe', 'crop'], ['Upscale', 'upscale'], ['Social edits', 'social', 0, 1], ['AI B-roll', 'broll'], ['Translate & dub', 'translate'], ['See all presets', 'right', 'all']];
  return shell(`<div class="page"><div class="hero"><div class="tabs"><a class="tab ${tab === 'clip' ? 'on' : ''}" href="/dashboard" data-link>${ic('scissors', 18)}Clip long video</a><a class="tab ${tab === 'auto' ? 'on' : ''}" ${FREE ? 'href="#" data-act="premium" data-what="Auto-edit footage"' : 'href="/dashboard/auto-edit-footage" data-link'}>${ic('wand', 18)}Auto-edit footage</a><a class="tab editor ${tab === 'edit' ? 'on' : ''}" ${FREE ? 'href="#" data-act="premium" data-what="The standalone editor"' : 'href="/editor-start?entry=OpenEditor" data-link'}>${ic('scissors', 16)}Open editor</a></div>${box}</div>
  <div class="chiprow">${chips.map((c) => !c ? '<span class="chipsep"></span>' : `<button class="chip ${c[2] === 'preset' ? 'preset' : ''}" data-chip="${esc(c[0])}">${c[1] ? ic(c[1], 16) : ''}${esc(c[0])}${c[3] ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>
  <div class="sec-h" id="recent-h" style="margin-top:80px"><span>Recent projects</span><a class="va" href="/projects" data-link>View all ${ic('right', 14)}</a><span class="pill"><i class="${state.me.settings.autoImport ? 'on' : ''}"></i>Auto-import: ${state.me.settings.autoImport ? 'On' : 'Off'}<i class="dot"></i></span></div>
  <div class="grid" id="recent"><div class="pcard"><div class="thumb"></div></div></div>
  ${footer()}</div>`, path);
}

function wireDashboard(type) {
  const tab = tabOf(type);
  let pi = 0; const inp = $('#link');
  const rot = inp && setInterval(() => { if (!document.body.contains(inp)) return clearInterval(rot); if (document.activeElement !== inp && !inp.value) { pi = (pi + 1) % PLACEHOLDERS.length; inp.placeholder = `Drop a ${PLACEHOLDERS[pi]} link`; } }, 2500);
  const file = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' });
  const useFile = async (f) => {
    if (!f) return;
    const btn = $('#go'); if (btn) { btn.disabled = true; btn.innerHTML = `${ic('refresh', 18, 'spin')}Uploading…`; }
    try { const r = await api(`/upload?name=${encodeURIComponent(f.name)}&size=${f.size}`, { method: 'POST', raw: state.me.engine === 'real' ? f : new Blob([]) }); if (tab !== 'clip') { sessionStorage.setItem(tab + 'Draft', JSON.stringify(r)); return tab === 'auto' ? autoOptions() : editOptions(); } startDraft(r); }
    catch (e) { if (btn) { btn.disabled = false; btn.textContent = 'Get clips in 1 click'; } showErr(e.message); }
  };
  file.onchange = () => useFile(file.files[0]);
  const showErr = (m) => { const el = $('#lerr'); if (el) el.innerHTML = `<div class="err-inline">${esc(m)}</div>`; else toast(m); };
  const startDraft = (src) => { sessionStorage.setItem('clipDraft', JSON.stringify(src)); go('/recipes?from=dashboard&preset=builtin%3Along-to-shorts&entry=ClipLongVideo'); };
  $('#up')?.addEventListener('click', () => file.click());
  $('#gd')?.addEventListener('click', () => modal(`<h3>Google Drive</h3><p>Connecting Google Drive is not available in this demo. Paste a link or upload a file instead.</p><div class="row"><button class="btn-white" style="height:40px" id="okgd">Got it</button></div>`).el.querySelector('#okgd').onclick = () => $('.modalbg')?.remove());
  const submit = async () => {
    const v = inp.value.trim(); if (!v) { inp.focus(); return showErr('Paste a video link to get started.'); }
    const b = $('#go'); b.disabled = true; b.innerHTML = `${ic('refresh', 18, 'spin')}Get clips in 1 click`; $('#box').style.opacity = .7; $('#lerr').innerHTML = '';
    try { const r = await api('/probe', { method: 'POST', body: { url: v } }); if (!r.ok) throw new Error(r.message); startDraft(r); }
    catch (e) { b.disabled = false; b.textContent = 'Get clips in 1 click'; $('#box').style.opacity = 1; showErr(e.message); }
  };
  $('#go')?.addEventListener('click', submit); inp?.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  $('#choose')?.addEventListener('click', (e) => popover(e.currentTarget, [{ label: 'Upload from device', v: 'up' }, { label: 'Google Drive', v: 'gd' }], { onPick: (it) => (it.v === 'up' ? file.click() : upgradeModal('Google Drive import')) }));
  const drop = $('#drop'); if (drop) { ['dragover', 'dragenter'].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add('over'); })); ['dragleave', 'drop'].forEach((n) => drop.addEventListener(n, () => drop.classList.remove('over'))); drop.addEventListener('drop', (e) => { e.preventDefault(); useFile(e.dataTransfer.files[0]); }); }
  $$('[data-chip]').forEach((c) => c.addEventListener('click', () => { const n = c.dataset.chip; if (FREE) return upgradeModal(n.startsWith('Preset') ? 'Preset templates' : n); if (n.startsWith('Preset')) go('/recipes?from=dashboard&preset=REDACTED&entry=RecipeQuickstart'); else if (n === 'See all presets') toast('The preset library is not part of this demo.'); else go(`/recipes?from=dashboard&entry=RecipeQuickstart&recipe=${encodeURIComponent(n)}`); }));
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => { const el = $('#' + b.dataset.scroll); el.scrollBy({ left: 360, behavior: 'smooth' }); }));
  if (tab === 'auto' && sessionStorage.getItem('autoDraft')) autoOptions();
  if (tab === 'edit' && sessionStorage.getItem('editDraft')) editOptions();
  loadProjects($('#recent'), 3, true);
  const pid = new URL(location.href).searchParams.get('projectId');
  if (pid) { const w = setInterval(async () => { if (!location.search.includes(pid)) return clearInterval(w); try { const p = await api('/projects/' + pid); if (p.status === 'completed') { clearInterval(w); go('/clip/' + pid); } else if (p.status === 'failed') { clearInterval(w); document.title = 'Failed | Clipping'; toast(p.error?.message || 'Processing failed'); } else document.title = `${Math.round(p.progress * 100)}% · 0/1 | Clipping`; } catch { clearInterval(w); } }, 1500); }
  $('#recent-h .pill')?.addEventListener('click', async () => { state.me.settings = await api('/settings', { method: 'POST', body: { autoImport: !state.me.settings.autoImport } }); render(); });
}

// Options card of the Auto-edit footage tab, shown in place of the drop zone once a video is uploaded.
function autoOptions() {
  const box = $('.hero .box'); const src = JSON.parse(sessionStorage.getItem('autoDraft') || 'null'); if (!box || !src) return;
  const o = { captions: true, captionTemplate: 'word-cut', headline: true, silence: true, fillers: true, cleanAudio: true, language: 'English', translateTo: null };
  const rows = [['captions', 'Captions', 'Burned-in animated captions', 'cc'], ['headline', 'AI headline', 'A title card for the first seconds, written from the transcript', 'type'], ['silence', 'Remove silences', 'Shrinks long pauses to a short beat', 'scissors'], ['fillers', 'Remove filler words', 'Cuts um, uh, er and similar', 'speech'], ['cleanAudio', 'Clean up audio', 'Noise reduction and loudness levelling', 'audio'], ['translate', 'Translate captions', 'Captions in another language, translated by AI', 'translate']];
  const draw = () => {
    box.classList.add('auto-opts'); box.style.height = 'auto';
    box.innerHTML = `<div class="ao-head"><img src="${esc(src.thumbnail)}" alt=""><div><b>${esc(src.title)}</b><span>${Math.floor(src.duration / 60)}:${String(src.duration % 60).padStart(2, '0')} · ${esc(src.quality || '')}</span></div><button class="ao-x" id="ao-x" aria-label="Remove video">${ic('trash', 18)}</button></div>
    <div class="ao-rows">${rows.map(([k, l, d, i]) => `<div class="ao-row"><span class="ico">${ic(i, 16)}</span><div><b>${l}</b><small>${d}</small></div>${k === 'captions' && o.captions ? `<span class="dd" id="ao-cap">${esc(CAPTIONS.find((c) => c[0] === o.captionTemplate)?.[1])}${ic('down', 14)}</span>` : ''}${k === 'translate' && o.translateTo ? `<span class="dd" id="ao-tr">${esc(o.translateTo)}${ic('down', 14)}</span>` : ''}<div class="sw ${(k === 'translate' ? o.translateTo : o[k]) ? 'on' : ''}" data-ao="${k}" role="switch" aria-checked="${!!(k === 'translate' ? o.translateTo : o[k])}"></div></div>`).join('')}</div>
    <div class="ao-foot"><span class="dd" id="ao-lang">Speech language: <b>${o.language}</b>${ic('down', 14)}</span><button class="btn-white" id="ao-go">Edit my video</button></div><div id="lerr"></div>`;
    $$('[data-ao]', box).forEach((s) => (s.onclick = () => { const k = s.dataset.ao; if (k === 'translate') o.translateTo = o.translateTo ? null : (o.language === 'Spanish' ? 'English' : 'Spanish'); else o[k] = !o[k]; if (k === 'translate' && o.translateTo) o.captions = true; draw(); }));
    $('#ao-tr', box)?.addEventListener('click', (e) => popover(e.currentTarget, LANGS.filter((l) => l !== o.language).map((l) => ({ label: l, on: o.translateTo === l })), { onPick: (it) => { o.translateTo = it.label; draw(); } }));
    $('#ao-cap', box)?.addEventListener('click', (e) => popover(e.currentTarget, CAPTIONS.filter((c) => c[0] !== 'word-cut2').map(([id, n]) => ({ label: n, v: id, on: o.captionTemplate === id })), { onPick: (it) => { o.captionTemplate = it.v; draw(); } }));
    $('#ao-lang', box).addEventListener('click', (e) => popover(e.currentTarget, LANGS.map((l) => ({ label: l, on: o.language === l })), { onPick: (it) => { o.language = it.label; if (o.translateTo === it.label) o.translateTo = null; draw(); } }));
    $('#ao-x', box).onclick = () => { sessionStorage.removeItem('autoDraft'); go('/dashboard/auto-edit-footage', true); };
    $('#ao-go', box).onclick = async () => {
      const b = $('#ao-go', box); b.disabled = true; b.innerHTML = `${ic('refresh', 18, 'spin')}Starting…`;
      try { const p = await api('/projects', { method: 'POST', body: { kind: 'auto', source: src, options: { ...o, captionTemplate: o.captions ? o.captionTemplate : null } } }); sessionStorage.removeItem('autoDraft'); go('/dashboard/auto-edit-footage?projectId=' + p.id); }
      catch (e) { b.disabled = false; b.textContent = 'Edit my video'; $('#lerr', box).innerHTML = `<div class="err-inline">${esc(e.message)}</div>`; }
    };
  };
  draw();
}

// Open editor tab: any uploaded video goes straight into the editor.
function editOptions() {
  const box = $('.hero .box'); const src = JSON.parse(sessionStorage.getItem('editDraft') || 'null'); if (!box || !src) return;
  let language = 'English';
  const draw = () => {
    box.classList.add('auto-opts'); box.style.height = 'auto';
    box.innerHTML = `<div class="ao-head"><img src="${esc(src.thumbnail)}" alt=""><div><b>${esc(src.title)}</b><span>${Math.floor(src.duration / 60)}:${String(src.duration % 60).padStart(2, '0')} · ${esc(src.quality || '')}</span></div><button class="ao-x" id="ao-x" aria-label="Remove video">${ic('trash', 18)}</button></div>
    <p class="ao-note">The video is transcribed first, so you can edit captions and the transcript. Then trim, reframe, add a headline and export.</p>
    <div class="ao-foot"><span class="dd" id="ao-lang">Speech language: <b>${language}</b>${ic('down', 14)}</span><button class="btn-white" id="ao-go">Open in editor</button></div><div id="lerr"></div>`;
    $('#ao-lang', box).addEventListener('click', (e) => popover(e.currentTarget, LANGS.map((l) => ({ label: l, on: language === l })), { onPick: (it) => { language = it.label; draw(); } }));
    $('#ao-x', box).onclick = () => { sessionStorage.removeItem('editDraft'); go('/dashboard/open-editor', true); };
    $('#ao-go', box).onclick = async () => {
      const b = $('#ao-go', box); b.disabled = true; b.innerHTML = `${ic('refresh', 18, 'spin')}Starting…`;
      try { const p = await api('/projects', { method: 'POST', body: { kind: 'edit', source: src, options: { language } } }); sessionStorage.removeItem('editDraft'); go('/dashboard/open-editor?projectId=' + p.id); }
      catch (e) { b.disabled = false; b.textContent = 'Open in editor'; $('#lerr', box).innerHTML = `<div class="err-inline">${esc(e.message)}</div>`; }
    };
  };
  draw();
}

let procTimer;
async function processingModal(id) {
  const m = modal(`<div id="pm"></div>`); m.el.querySelector('.modal').classList.add('wide');
  const draw = async () => {
    if (!document.body.contains(m.el)) return;
    const p = await api('/projects/' + id); const o = p.options || {};
    if (p.status === 'completed') { m.close(); return go('/clip/' + id); }
    const pct = Math.round(p.progress * 100);
    const tools = [o.captionTemplate ? 'Captions' : null, o.hook ? `Auto hook: Auto headline` : null].filter(Boolean).map((t, i) => (i ? `<span class="v">, ${t.replace(/^(Auto hook): (.*)$/, '$1</span>: <span class="v">$2')}</span>` : `<span class="v">${t}</span>`)).join('');
    $('#pm', m.el).innerHTML = `<h3 style="font-size:18px">Your video is processing</h3><p style="margin-bottom:16px">You will receive a notification once your video is done processing, check back soon!</p><div class="term"><div>Fetching video <span class="v">"${esc(p.title)}"</span></div><br><div><span class="k">Recipe:</span><span class="v">${p.kind === 'auto' ? 'Auto-edit footage' : p.kind === 'edit' ? 'Open editor' : 'Clip long video'}</span></div><div><span class="k">Brand kit:</span><span class="v">No brand kit</span></div><div><span class="k">Video output:</span><span class="v">${p.kind === 'auto' ? 'One edited video' : p.kind === 'edit' ? 'One video in the editor' : `Multiple clips, ${esc(o.ratio || '9:16')}`}</span></div><div><span class="k">AI picks:</span><span class="v">${esc(o.aiPicks || 'Auto')}</span></div><div><span class="k">Clip length:</span><span class="v">Auto (0m-3m)</span></div><div><span class="k">Tools:</span>${tools}</div><br><div>Estimated waiting time: ~ ${Math.max(1, Math.ceil((p.eta || 0) / 60))}min</div><br><div class="g">Processing &amp; analyzing... ${pct}%</div></div><div class="row"><button class="btn-white" style="height:40px" id="pmc">Close</button></div>`;
    $('#pmc', m.el).onclick = m.close;
  };
  await draw(); const t = setInterval(() => (document.body.contains(m.el) ? draw().catch(() => {}) : clearInterval(t)), 1500);
}

function projCard(p) {
  const status = p.expired ? `<div class="ov"><span class="tag">${ic('alert', 16)}Project expired</span></div>` : p.status === 'processing' ? `<div class="ov"><span class="tag proc" style="background:var(--teal-soft);color:var(--teal)">${ic('clock', 16)}${Math.round((p.progress || 0) * 100)}% (ETA ${Math.max(1, Math.ceil((p.eta || 0) / 60))}m)</span></div>` : p.status === 'failed' ? `<div class="ov"><span class="tag fail">${ic('alert', 16)}Failed</span></div>` : '';
  return `<div class="pcard" data-id="${esc(p.id)}" data-exp="${p.expired ? 1 : 0}" data-proc="${p.status === 'processing' ? 1 : 0}"><div class="thumb"><img src="${esc(p.source?.thumbnail || '/media/source.jpg')}" alt="">${p.status === 'processing' || (!p.expired && p.status === 'completed' && Date.now() - p.createdAt < 864e5) ? '<div class="gtag"><span>New</span></div>' : ''}${status}</div><div class="tt"><span>${esc(p.title)}</span><button data-menu aria-label="More">${ic('dots', 18)}</button></div><div class="dt">${fmtDate(p.createdAt)}${p.clipCount ? ` · ${p.clipCount} clips` : ''}</div></div>`;
}
async function loadProjects(host, limit, home) {
  let list; try { list = await api('/projects'); } catch { host.innerHTML = `<div class="empty"><b>Something went wrong</b><span>We could not load your projects.</span><button class="btn-dark" id="retry">Try again</button></div>`; $('#retry', host).onclick = () => loadProjects(host, limit, home); return; }
  if (limit) list = list.slice(0, limit);
  if (!list.length) { host.innerHTML = home ? '' : `<div class="empty"><b>No projects yet</b><span>Upload a video to get your first clips.</span></div>`; return; }
  host.innerHTML = (home ? '' : `<div class="upcard" data-link-to="/dashboard">${ic('plus', 28)}Upload new video</div>`) + list.map(projCard).join('');
  $$('.pcard', host).forEach((c) => (c.onclick = (e) => { if (e.target.closest('[data-menu]')) return projMenu(e.target.closest('[data-menu]'), c.dataset.id, host, limit, home); if (c.dataset.exp === '1') return modal(`<h3>Project expired</h3><p>Projects on the Free plan are kept for 30 days. Upgrade to keep your projects.</p><div class="row"><button class="btn-dark" onclick="this.closest('.modalbg').remove()">Close</button></div>`); if (c.dataset.proc === '1') return processingModal(c.dataset.id); go('/clip/' + c.dataset.id); }));
  $('[data-link-to]', host)?.addEventListener('click', (e) => go(e.currentTarget.dataset.linkTo));
  if (list.some((p) => p.status === 'processing')) setTimeout(() => document.body.contains(host) && loadProjects(host, limit, home), 2500);
}
function projMenu(anchor, id, host, limit, home) {
  popover(anchor, [{ label: 'Open', v: 'o' }, { label: 'Delete', v: 'd' }], { onPick: async (it) => { if (it.v === 'o') return go('/clip/' + id); try { await api('/projects/' + id, { method: 'DELETE' }); toast('Project deleted'); loadProjects(host, limit, home); } catch (e) { toast(e.message); } } });
}

async function projects(path, sub) {
  return shell(`<div class="page"><h1 class="ph">My projects</h1><div class="ptabs">${[['', 'All'], ['collections', 'Collections (1)'], ['projects', 'Projects (…)']].map(([k, l]) => `<a href="/projects${k ? '?tab=' + k : ''}" data-link class="${(sub || '') === k ? 'on' : ''}" ${k === 'projects' ? 'id="ptab"' : ''}>${l}</a>`).join('')}</div>
  ${sub !== 'projects' ? `<div class="sub-h" style="margin-top:0">Collections</div><div class="coll"><button class="c add" data-act="upgrade">${ic('plus', 22)}<span>Add new collection</span>${crown()}</button><div class="c fav">${ic('heart', 24)}<div>Favorites<small id="favn">0 clips</small></div></div></div>` : ''}
  ${sub !== 'collections' ? `<div class="sub-h"><span>Projects</span><span class="sp"></span><small>0 GB / 0 GB</small><span class="pill" id="asave"><i></i>Auto-save</span><span class="pill" id="aimp"><i class="${state.me.settings.autoImport ? 'on' : ''}"></i>Auto-import<i class="dot"></i></span></div><div class="grid" id="plist"></div>` : ''}${footer()}</div>`, '/projects');
}
async function wireProjects() {
  const h = $('#plist'); if (h) { await loadProjects(h, 0, false); const n = $$('.pcard', h).length; const t = $('#ptab'); if (t) t.textContent = `Projects (${n})`; }
  try { const c = await api('/collections'); $('#favn') && ($('#favn').textContent = `${c[0].clips.length} clips`); } catch {}
  $('#asave')?.addEventListener('click', () => upgradeModal('Auto-save'));
  $('#aimp')?.addEventListener('click', () => upgradeModal('Auto-import'));
}

const STATIC = {
  '/brand-kits': () => `<div class="gp"><h1>Asset library</h1><p class="lead">Brand style is part of Oclip Premium. Get Premium to build your Brand style with custom fonts, intro &amp; outro cards, B-roll, and more. <a href="#" data-act="upgrade" style="color:var(--fg);text-decoration:underline">Upgrade to Pro</a></p>
   <div class="card" style="background:none;border:0;padding:0"><div style="color:var(--fg);font-weight:500;margin-top:28px">Censored words list <span class="soon">Beta</span></div><div style="display:flex;gap:12px;margin-top:12px"><button class="btn-dark" data-act="upgrade">+ Add my list</button><button class="btn-dark">Curse words <small style="color:var(--muted)">Default</small></button></div>
   <div class="fade" style="margin-top:36px"><div style="font-weight:500">Custom words <span class="soon">Coming soon</span></div><div style="display:grid;grid-template-columns:1fr 1fr;max-width:520px;margin-top:12px;gap:10px;font-size:13px"><b style="font-weight:400">Word</b><b style="font-weight:400">Replace</b><span>curry</span><span>Curry</span><span>clip</span><span>Clip</span></div></div>
   <div style="color:var(--fg);font-weight:500;margin-top:40px">Fonts (0/0)</div><div class="upcard" style="margin-top:12px;width:240px;height:130px">${ic('upload', 24)}Add or drag file here</div></div></div>`,
};

const notFound = (path) => shell(`<div class="center404"><h2>404</h2><p>This page could not be found.</p></div>`, path);

// ---------- router ----------
async function boot() { try { state.me = await api('/me'); } catch { state.me = null; } }
async function render() {
  const u = new URL(location.href); const path = u.pathname.replace(/\/+$/, '') || '/';
  document.title = 'Oclip Free by coding180 - AI-powered Video Repurposing';
  if (path === '/login') return go('/dashboard', true);
  await boot();
  if (FREE && /^\/(brand-kits|editor-start|dashboard\/(auto-edit-footage|open-editor))$/.test(path)) { go('/dashboard', true); return setTimeout(() => upgradeModal('This feature'), 50); }
  let m;
  if (path === '/') return go('/dashboard', true);
  if (path === '/dashboard/open-editor' && !u.searchParams.get('projectId')) return go('/editor-start?entry=OpenEditor', true);
  if (path === '/dashboard' || (m = path.match(/^\/dashboard\/([\w-]+)$/))) { const type = m?.[1]; if (type && type !== 'auto-edit-footage' && type !== 'long-to-shorts' && type !== 'open-editor') { app.innerHTML = notFound(path); return; } app.innerHTML = dashboard(path, type); return wireDashboard(type); }
  if ((m = path.match(/^\/editor-ux\/([\w-]+)$/))) { app.innerHTML = ''; return renderOpenEditor(app, m[1], u.searchParams.get('clipId')); }
  if (path === '/editor-start') { app.innerHTML = ''; return renderEditorStart(app, u); }
  if (path === '/projects') { const t = u.searchParams.get('tab') || ''; app.innerHTML = await projects(path, t); return wireProjects(); }
  if (path === '/recipes') { app.innerHTML = ''; return renderPresets(app, u); }
  if ((m = path.match(/^\/clip\/([\w-]+)$/))) { app.innerHTML = ''; return renderProject(app, m[1], shell); }
  if ((m = path.match(/^\/editor\/([\w-]+)\/([\w-]+)$/))) { app.innerHTML = ''; return renderEditor(app, m[1], m[2]); }
  if (STATIC[path]) { app.innerHTML = shell(`<div class="page">${STATIC[path]()}${footer()}</div>`, path); return; }
  app.innerHTML = notFound(path);
}
window.addEventListener('route', render); window.addEventListener('popstate', render);
await boot(); render();
