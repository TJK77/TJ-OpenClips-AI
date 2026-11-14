import { FREE } from './edition.js';
import { ic, esc, $, $$, state, api, go, toast, modal, upgradeModal, upgradeOverlay, popover, crown, topbar, banner, fmtTime, fmtDate, bindGlobal } from './core.js';

export const CAPTIONS = [
  ['word-cut', 'Word Cut', 't-word'], ['word-cut2', 'Word Cut', 't-word'], ['marker', 'Marker Sweep', 't-marker'], ['neg', 'Negative keywords', 't-neg'],
  ['karaoke', 'Karaoke', 't-karaoke'], ['hand', 'Handwritten', 't-simple'], ['mozi', 'Mozi', 't-simple'], ['simple', 'Simple', 't-simple'],
];
const GENRES = ['Auto', 'Q&A', 'Commentary', 'Marketing', 'Webinar', 'Motivational speech', 'Podcast', 'Interview', 'Gaming', 'Vlog', 'Educational', 'News'];
const LANGS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Dutch', 'Turkish'];
const LENGTHS = [['auto', 'Auto (0m-3m)'], ['<30s', '<30s'], ['30-59', '30s~59s'], ['60-89', '60s~89s'], ['90-3m', '90s~3m'], ['3-5m', '3m~5m']];
const RATIOS = [['9:16', '9:16', 0], ['16:9', '16:9', 1], ['1:1', '1:1', 1], ['4:5', '4:5', 1]];
const LAYOUTS = ['Fill', 'Fit', 'Split', 'Three', 'Four', 'ScreenShare', 'Gameplay'];

const rcTop = (title) => `<div class="rc-top"><a class="back" href="/dashboard" data-link aria-label="Back">${ic('left', 20)}</a><div class="ttl">${esc(title || '')}</div>${topbar().replace('class="topbar"', 'class="topbar" style="position:static;padding:0;height:auto"')}<button class="btn-add up" data-act="upgrade">${crown()}Get Premium</button></div>`;

// ---------- options step (/recipes) ----------
export async function renderPresets(app, u) {
  bindGlobal(app);
  const draft = JSON.parse(sessionStorage.getItem('clipDraft') || 'null');
  const o = { range: draft ? [0, draft.duration] : [0, 0], lang: 'English', genre: 'Auto', ratio: '9:16', layouts: new Set(LAYOUTS), aiPicks: 'Auto', lengths: new Set(['auto']), moments: '', captions: true, captionTemplate: 'word-cut', hook: true, hookStyle: 'Headline', emojis: false, broll: false, speech: false, enhance: false, sfx: false, zoom: false, trans: false, color: false, dub: false, ctr: false, ctrLang: 'Spanish', open: true, link: '' };
  const toggles = [['emojis', 'Motion graphics', 0], ['broll', 'Auto B-roll', 0]];
  const premium = (k, label) => () => upgradeModal(label);

  const LBL = { captions: 'Caption options', hook: 'Auto hook', emojis: 'AI Emojis', broll: 'AI video B-roll', ctr: 'Caption translation' };
  const sw = (k, prem, label) => `<div class="sw ${o[k] ? 'on' : ''}" data-sw="${k}" data-prem="${FREE && !['captions', 'hook', 'ctr'].includes(k) ? esc(label || LBL[k] || 'This feature') : prem ? esc(label) : ''}" role="switch" aria-checked="${o[k]}"></div>`;
  const row = (icon, label, right, extra = '', cls = '') => `<div class="row-set ${cls}" data-rowname="${esc(label.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim())}"><span class="ico">${ic(icon, 16)}</span><span>${label}</span><span class="rt">${right}</span></div>${extra}`;

  const draw = () => {
    const left = draft ? `<div class="rcard"><div class="src"><div class="vthumb"><img src="${esc(draft.thumbnail)}" alt=""><span class="q">${esc(draft.quality || '4k')}</span><button class="del" data-del aria-label="Remove">${ic('trash', 18)}</button><div class="meta"><span class="dd" data-dd="lang">Speech language: <b>${o.lang}</b>${ic('down', 14)}</span><span class="dd" data-dd="genre">Genre: <b>${o.genre}</b>${ic('down', 14)}</span></div></div>
      <div class="rng"><div class="h"><span style="display:flex;align-items:center;gap:6px">Adjust range ${ic('info', 14)}</span><span class="saver">Credit saver</span></div><div class="strip" id="strip"><div class="fr"></div><div class="sh" id="shl"></div><div class="sh" id="shr"></div><div class="hd" id="hl"></div><div class="hd" id="hr"></div></div>
      <div class="times"><input id="t0" value="${fmtTime(o.range[0])}"><span>${fmtTime(o.range[1] - o.range[0])}</span><input id="t1" value="${fmtTime(o.range[1])}"></div>
      <div class="lay"><span class="l">Layout</span><span class="dd" data-dd="layout">${ic('phone', 14)} ${o.ratio}, ${o.layouts.size} layouts ${ic('down', 14)}</span><span class="dd" style="margin-left:auto" data-srt title="Use your own subtitles instead of speech-to-text">${o.srtName ? `SRT: ${esc(o.srtName.slice(0, 22))} ${ic('check', 14)}` : `Upload SRT ${ic('upload', 14)}`}</span></div></div></div></div>`
      : `<div class="rcard" style="padding:32px"><div class="drop" id="drop2" style="height:192px;gap:16px"><div style="color:var(--muted);font-size:14px">Drop your video here or choose a way to upload</div><div class="linkrow" style="width:400px;max-width:90%;height:48px;background:var(--chip)"><span>${ic('link', 16)}</span><input id="rl" placeholder="Drop a YouTube link" value="${esc(o.link)}"></div><div class="srcrow"><button class="srcbtn" id="rup">${ic('folder', 16)}Upload</button><button class="srcbtn" id="rgd">${ic('drive', 16)}Google Drive</button></div><div id="rerr"></div></div></div>`;
    const caps = `<div class="car" id="car">${CAPTIONS.map(([id, n, cl], i) => `<div class="cap ${o.captionTemplate === id ? 'sel' : ''}" data-cap="${id}"><div class="pv"><em>${i === 0 ? 'Selected' : ''}</em><span class="cap-ov ${cl}" style="position:static;font-size:15px;padding:0 8px">${cl === 't-marker' ? 'TO GET <em>STARTED</em>' : cl === 't-karaoke' ? 'TO GET <em>STARTED</em>' : 'To get<br>started'}</span></div>${n}</div>`).join('')}<div class="cap" data-more><div class="pv" style="font-size:13px;font-weight:500">View 37 more</div></div></div>`;
    const hooks = `<div class="hooks">${['The beauty of slowing down', 'Stop waiting. Start creating.', 'DEFAULT AUTO HEADLINE'].map((t, i) => `<div class="hk ${i === 2 ? 'sel' : ''}" style="background:linear-gradient(160deg,${['#7c5c3a', '#27272a', '#a45a32'][i]},#18181b)">${esc(t)}</div>`).join('')}</div>`;
    const cl = [...o.lengths].map((v) => LENGTHS.find((l) => l[0] === v)?.[1]).join(', ');
    const right = `<div class="sticky sum"><h4>Summary</h4><div class="r"><span>Clipping</span><span>${draft ? 'Free' : '-'}</span></div><div class="r"><span>Captions</span><span>${draft ? (o.captions ? 'Free' : 'Off') : '-'}</span></div>${!draft ? '<div class="r"><span>AI Emojis</span><span>-</span></div>' : ''}<hr><div class="r t"><span>Premium features</span><span class="dd" style="color:var(--body)">Applied to top ${draft ? 10 : 5} clips ${ic('down', 14)}</span></div><div class="r"><span>Headline</span><span>${draft ? 'Free' : '-'}</span></div><button class="btn-white" id="create" ${draft ? '' : 'disabled'}>Create</button><div class="legal">By continuing, you confirm you have rights to use this video.</div></div>`;
    $('#rcgrid').innerHTML = `<div>${left}<div class="rcard"><div class="sel2"><div class="tile" data-dd="recipe"><span class="ico" style="background:var(--accent)">${ic('grid', 16)}</span>Preset<span class="v">${draft ? 'Clip long video' : 'Preset template 1'}${ic('down', 14)}</span></div><div class="tile" data-dd="kit"><span class="ico" style="background:var(--teal)">${ic('brandkit', 16)}</span>Brand style<span class="v">No brand kit${ic('down', 14)}</span></div></div>
      <div class="hint">Your Preset sets which edits run. Your brand kit sets the look, like your logo, intro, outro and caption style.</div>
      <div class="rs" data-rs>Preset settings ${ic(o.open ? 'up' : 'down', 14)}</div>
      <div ${o.open ? '' : 'class="hidden"'}>
      ${row('scissors', 'Clipping', sw('clipping', 0), '', 'first').replace(sw('clipping', 0), '<div class="sw on" data-fixed></div>')}
      <div class="clipopts"><span class="dd" data-dd="picks">AI picks: <b>${o.aiPicks}</b>${ic('down', 14)}</span><span class="dd" data-dd="len">Clip length: <b>${esc(cl)}</b>${ic('down', 14)}</span></div>
      <div class="moments"><div class="lh"><span>Moments to include (optional)</span><span style="display:flex;gap:4px;align-items:center;cursor:pointer" data-how>How to prompt ${ic('info', 14)}</span></div><textarea id="mom" placeholder="Example: Compile all the hilarious moments">${esc(o.moments)}</textarea></div>
      <div class="group">Essentials</div>
      ${row('cc', 'Captions', sw('captions', 0))}${caps}
      ${row('hook', 'Auto hook <span class="soon" style="margin-left:6px">Beta</span>', `<span class="dd" data-dd="hookstyle">${o.hookStyle}${ic('down', 14)}</span>${sw('hook', 0)}`)}${hooks}
      ${row('emoji', 'Motion graphics <span class="soon" style="margin-left:6px">Beta</span>', '')}
      ${row('emoji', 'AI Emojis', sw('emojis', 0))}
      ${row('broll', 'Auto B-roll', '')}${row('broll', 'AI video B-roll', sw('broll', 0))}
      <div class="group">Sound sharp</div>
      ${row('speech', `Speech cleanup ${crown()}`, `<span class="dd" style="opacity:.6">Remove pause &amp; filler words${ic('down', 14)}</span>${sw('speech', 1, 'Speech cleanup')}`)}${row('audio', `Enhance audio ${crown()}`, sw('enhance', 1, 'Enhance audio'))}${row('sfx', `Auto SFX ${crown()}`, sw('sfx', 1, 'Auto SFX'))}
      <div class="group">Look good</div>
      ${row('zoom', `Auto Zoom ${crown()}`, sw('zoom', 1, 'Auto Zoom'))}${row('trans', `Auto transitions ${crown()}`, sw('trans', 1, 'Auto transitions'))}${row('color', `Auto Color Correction ${crown()}`, sw('color', 1, 'Auto Color Correction'))}
      <div class="group">Translate</div>
      ${row('globe', `Voice dubbing ${crown()}`, `<span class="dd" style="opacity:.6" data-dd="dub">Choose a language${ic('down', 14)}</span>${sw('dub', 1, 'Voice dubbing')}`)}${row('translate', 'Caption translation', `<span class="dd" data-dd="ctr">${o.ctrLang}${ic('down', 14)}</span>${sw('ctr', 0)}`)}
      </div></div></div><div>${right}</div>`;
    wire();
  };

  const strip = () => {
    const el = $('#strip'); if (!el || !draft) return; const d = draft.duration, w = () => el.clientWidth;
    const sync = () => { $('#shl').style.cssText = `left:0;width:${(o.range[0] / d) * 100}%`; $('#shr').style.cssText = `right:0;width:${(1 - o.range[1] / d) * 100}%`; $('#hl').style.left = `calc(${(o.range[0] / d) * 100}% )`; $('#hr').style.left = `calc(${(o.range[1] / d) * 100}% - 10px)`; $('#t0').value = fmtTime(o.range[0]); $('#t1').value = fmtTime(o.range[1]); $('.times span').textContent = fmtTime(o.range[1] - o.range[0]); };
    const drag = (hid, idx) => $(hid).addEventListener('mousedown', (e) => { e.preventDefault(); const rect = el.getBoundingClientRect(); const mv = (ev) => { const t = Math.round(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)) * d); if (idx === 0) o.range[0] = Math.min(t, o.range[1] - 5); else o.range[1] = Math.max(t, o.range[0] + 5); sync(); }; const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); });
    drag('#hl', 0); drag('#hr', 1); sync();
    const parse = (v) => { const p = v.split(':').map(Number); return p.some(isNaN) ? null : p.reduce((a, b) => a * 60 + b, 0); };
    ['#t0', '#t1'].forEach((s, i) => $(s).addEventListener('change', (e) => { const t = parse(e.target.value); if (t == null) return sync(); if (i === 0) o.range[0] = Math.max(0, Math.min(t, o.range[1] - 5)); else o.range[1] = Math.min(d, Math.max(t, o.range[0] + 5)); sync(); }));
  };

  const wire = () => {
    strip();
    $$('[data-sw]').forEach((s) => (s.onclick = () => { if (s.dataset.prem) return upgradeModal(s.dataset.prem); o[s.dataset.sw] = !o[s.dataset.sw]; s.classList.toggle('on', o[s.dataset.sw]); }));
    if (FREE) $$('.row-set:not(.first)').forEach((r) => (r.onclick = (e) => { if (e.target.closest('[data-sw],[data-dd]') || /^(Captions|Auto hook|Caption translation)/.test(r.dataset.rowname)) return; upgradeModal(r.dataset.rowname); }));
    $$('[data-cap]').forEach((c) => (c.onclick = () => { o.captionTemplate = c.dataset.cap; $$('[data-cap]').forEach((x) => x.classList.toggle('sel', x === c)); }));
    $('[data-more]')?.addEventListener('click', () => FREE ? upgradeModal('More caption styles') : modal(`<h3>Caption templates</h3><p>Pick a style for your captions.</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${Array.from({ length: 12 }, (_, i) => `<div class="cap"><div class="pv" style="font-size:12px">Style ${i + 9}</div></div>`).join('')}</div>`));
    $('[data-rs]')?.addEventListener('click', () => { o.open = !o.open; draw(); });
    $('[data-how]')?.addEventListener('click', () => modal(`<h3>How to prompt</h3><p>Describe the moments you want, for example "find all the times someone scored" or "the funniest parts". Leave it empty and AI picks the best moments.</p>`));
    $('#mom')?.addEventListener('input', (e) => (o.moments = e.target.value));
    $('[data-del]')?.addEventListener('click', () => { sessionStorage.removeItem('clipDraft'); go('/dashboard'); });
    $('[data-srt]')?.addEventListener('click', () => { if (o.srtName) { o.srt = ''; o.srtName = ''; return draw(); } const f = Object.assign(document.createElement('input'), { type: 'file', accept: '.srt,text/plain' }); f.onchange = async () => { const x = f.files[0]; if (!x) return; if (x.size > 600000) return toast('That subtitle file is too large (600 KB maximum).'); const txt = await x.text(); if (!txt.includes('-->')) return toast('That does not look like an .srt subtitle file.'); o.srt = txt; o.srtName = x.name; toast('Subtitles added. Clips will use them instead of speech-to-text.'); draw(); }; f.click(); });
    $$('[data-dd]').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation(); const k = el.dataset.dd; if (FREE && ['dub', 'recipe', 'kit'].includes(k)) return upgradeModal({ hookstyle: 'Hook styles', ctr: 'Caption translation', dub: 'Voice dubbing', layout: 'Aspect ratios and layouts', recipe: 'More presets', kit: 'Brand styles' }[k]); const pick = (key, list) => popover(el, list.map((v) => ({ label: v, on: o[key] === v })), { onPick: (it) => { o[key] = it.label; draw(); } });
      if (k === 'lang') pick('lang', LANGS); else if (k === 'genre') pick('genre', GENRES); else if (k === 'hookstyle') pick('hookStyle', ['Headline', 'Editorial', 'Statement', 'Classic']); else if (k === 'ctr') pick('ctrLang', LANGS);
      else if (k === 'dub') upgradeModal('Voice dubbing');
      else if (k === 'picks') popover(el, [['Auto', 'Let AI choose the optimal model'], ['Smart Clip', 'Best for any kind of video'], ['Talk Clip', 'Best for talking videos']].map(([l, s]) => ({ label: l, sub: s, on: o.aiPicks === l })), { onPick: (it) => { o.aiPicks = it.label; draw(); } });
      else if (k === 'len') popover(el, LENGTHS.map(([v, l]) => ({ label: l, v, on: o.lengths.has(v) })), { multi: true, onPick: (it, items) => { if (it.v === 'auto') { o.lengths = new Set(['auto']); } else { o.lengths.delete('auto'); o.lengths.has(it.v) ? o.lengths.delete(it.v) : o.lengths.add(it.v); if (!o.lengths.size) o.lengths.add('auto'); } items.forEach((x) => (x.on = o.lengths.has(x.v))); $('.clipopts [data-dd=len] b').textContent = [...o.lengths].map((v) => LENGTHS.find((l) => l[0] === v)[1]).join(', '); } });
      else if (k === 'layout') popover(el, [], { width: 420, html: () => `<div style="padding:4px 6px;color:var(--muted);font-size:13px;margin-bottom:8px">Select ratio</div><div style="display:flex;gap:10px">${RATIOS.map(([v, l, p]) => `<div data-r="${v}" style="cursor:pointer;text-align:center;font-size:12px"><div style="width:${v === '16:9' ? 90 : 64}px;height:${v === '16:9' ? 50 : v === '1:1' ? 64 : v === '4:5' ? 80 : 90}px;border-radius:10px;background:var(--chip);border:2px solid ${o.ratio === v ? 'var(--accent)' : 'transparent'}"></div>${l} ${p ? crown() : ''}</div>`).join('')}</div><div style="padding:14px 6px 8px;color:var(--muted);font-size:13px">Layouts AI can use</div><div style="display:flex;gap:8px;flex-wrap:wrap">${LAYOUTS.map((l) => `<div data-l="${l}" style="text-align:center;font-size:11px;cursor:pointer"><div style="width:44px;height:64px;border-radius:8px;background:var(--chip);border:2px solid ${o.layouts.has(l) ? 'var(--accent)' : 'transparent'}"></div>${l}</div>`).join('')}</div>` });
      else if (k === 'recipe' || k === 'kit') upgradeModal(k === 'recipe' ? 'More presets' : 'Brand styles');
    }));
    $('#create')?.addEventListener('click', create);
    $('#rup')?.addEventListener('click', () => pickFile());
    $('#rgd')?.addEventListener('click', () => upgradeModal('Google Drive import'));
    $('#rl')?.addEventListener('keydown', async (e) => { if (e.key !== 'Enter') return; o.link = e.target.value; try { const r = await api('/probe', { method: 'POST', body: { url: o.link } }); if (!r.ok) throw new Error(r.message); sessionStorage.setItem('clipDraft', JSON.stringify(r)); go(location.pathname + location.search, true); } catch (er) { $('#rerr').innerHTML = `<div class="err-inline">${esc(er.message)}</div>`; } });
  };
  const layoutHandler = (e) => {
    const r = e.target.closest('[data-r]'), l = e.target.closest('[data-l]');
    if (r) { o.ratio = r.dataset.r; }
    if (l) { o.layouts.has(l.dataset.l) ? (o.layouts.size > 1 && o.layouts.delete(l.dataset.l)) : o.layouts.add(l.dataset.l); }
    if (r || l) { $$('.pop').forEach((p) => p.remove()); draw(); }
  };
  document.addEventListener('click', layoutHandler);
  const pickFile = () => { const f = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' }); f.onchange = async () => { const x = f.files[0]; if (!x) return; try { const r = await api(`/upload?name=${encodeURIComponent(x.name)}&size=${x.size}`, { method: 'POST', raw: state.me.engine === 'real' ? x : new Blob([]) }); sessionStorage.setItem('clipDraft', JSON.stringify(r)); go(location.pathname + location.search, true); } catch (er) { const el = $('#rerr'); el ? (el.innerHTML = `<div class="err-inline">${esc(er.message)}</div>`) : toast(er.message); } }; f.click(); };
  const create = async () => {
    const b = $('#create'); b.disabled = true; b.innerHTML = `${ic('refresh', 18, 'spin')}Creating…`;
    try {
      const options = { range: o.range, language: o.lang, genre: o.genre, ratio: o.ratio, layouts: [...o.layouts], aiPicks: o.aiPicks, clipLength: [...o.lengths], keywords: o.moments.split(',').map((s) => s.trim()).filter(Boolean), moments: o.moments, captionTemplate: o.captions ? o.captionTemplate : null, hook: o.hook ? o.hookStyle : null, emojis: o.emojis, broll: o.broll, captionTranslation: o.ctr ? o.ctrLang : null, srt: o.srt || undefined, maxClips: 8 };
      const p = await api('/projects', { method: 'POST', body: { source: draft, options } });
      sessionStorage.removeItem('clipDraft'); go('/dashboard?projectId=' + p.id);
    } catch (e) { b.disabled = false; b.textContent = 'Create'; toast(e.message); }
  };

  app.innerHTML = `<div class="rc">${rcTop(draft?.title)}<div class="rc-body"><div class="rc-grid" id="rcgrid"></div></div></div><button class="support" aria-label="Support">${ic('headset', 22)}</button>`;
  if (draft && !sessionStorage.getItem('clipTour')) {
    sessionStorage.setItem('clipTour', '1');
    const tip = document.createElement('div'); tip.className = 'modalbg'; tip.style.background = 'rgba(0,0,0,.72)';
    tip.innerHTML = `<div style="position:absolute;left:85px;top:162px;width:360px;color:#fff;font-size:14px;line-height:24px"><div style="font-size:20px;font-weight:600;margin-bottom:12px">Now serving: Presets</div>Pick a Preset for the edits and a brand kit for your logo, intro, outro and caption style. Turn edits on or off below.<br><br>Your default and brand template settings are already Presets. Pick one and go.</div><button class="btn-white" style="position:absolute;left:710px;top:480px;height:40px;border-radius:10px;font-size:14px;width:80px" id="gotit">Got it</button>`;
    document.body.append(tip); $('#gotit', tip).onclick = () => tip.remove();
  }
  draw();
}

// ---------- project page: results (/clip/:id). Processing happens on the dashboard (modal) ----------
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const ts = (r) => `[${mmss(r[0])}-${mmss(r[1])}]`;
export async function renderProject(app, id, shell, u) {
  let p;
  const layout = new URL(location.href).searchParams.get('layout') === 'list' ? 'list' : 'grid';
  const view = (inner, title) => {
    app.innerHTML = shell(`<div class="page" id="pj" style="max-width:none;margin:0;padding:0 9px 100px">${inner}</div>`, '/projects');
    const tb = $('.topbar'); if (tb) { tb.insertAdjacentHTML('afterbegin', `<div class="crumb"><a href="/projects" data-link>My projects</a><span>/</span><b>${ic('projects', 16)}<span style="overflow:hidden;text-overflow:ellipsis">${esc(title || '')}</span></b></div><div class="searchbox">${ic('search', 16)}Find keywords or moments…<kbd>⌘ K</kbd></div>`); $('.mnav', tb)?.remove(); }
  };
  try { p = await api('/projects/' + id); } catch (e) { return view(`<div class="empty"><b>${e.status === 404 ? 'Project not found' : 'Something went wrong'}</b><span>${esc(e.message)}</span><a class="btn-dark" style="display:grid;place-items:center;padding-top:10px" href="/projects" data-link>Back to projects</a></div>`, ''); }
  if (p.status !== 'completed' || p.expired) return go('/dashboard' + (p.expired ? '' : '?projectId=' + id), true);
  if (p.kind === 'auto' && p.result) return autoResult(p, view);
  if (p.kind === 'edit' && p.clips?.[0]) return go(`/editor-ux/${p.id}?clipId=${p.clips[0].id}`, true);
  const clips = p.clips; let sort = 0, favs = new Set(), dis = new Set();
  const edit = (c) => go(`/editor/${p.id}/${c.id}`);
  const draw = () => {
    const list = clips;
    const toolbar = `<div class="rtool"><button class="tog ${layout === 'grid' ? 'on' : ''}" data-lay="grid" aria-label="Grid">${ic('grid', 18)}</button><button class="tog ${layout === 'list' ? 'on' : ''}" data-lay="list" aria-label="List">${ic('menu', 18)}</button><span class="lbl">Original clips</span><span class="sp"></span><button class="tb sel" id="sel">${ic('check', 16)}Select</button><button class="tb" id="flt">${ic('search', 14)}Filter</button><button class="tb" aria-label="Sort" id="srt">${ic('refresh', 16)}</button><button class="tb" aria-label="Upload" id="upl">${ic('upload', 16)}</button><button class="tb" aria-label="More" id="more">${ic('dots', 18)}</button></div><div class="rsub" style="${layout === 'list' ? 'margin-left:94px' : ''}"><span>Original clips (${list.length})</span><span class="ch">${ic('grid', 14)}Clip long video (2 features)</span></div>`;
    const grid = `<div class="cgrid">${list.map((c) => `<div class="cc" data-c="${c.id}"><div class="th" data-open><img src="${c.poster}" alt=""><span class="cube">${ic('grid', 14)}</span><span class="chip2"><span>00:00</span>${mmss(c.duration)}</span></div><div class="ac"><button data-sched aria-label="Schedule">${ic('calendar', 18)}</button><button data-dl="${c.id}" aria-label="Download">${ic('download', 18)}</button><button data-edit="${c.id}" aria-label="Edit">${ic('scissors', 18)}</button></div><h4>${esc(c.title)}</h4></div>`).join('')}</div>`;
    const rows = list.map((c) => `<div class="lrow" data-c="${c.id}"><div class="votes"><button data-fav="${c.id}" style="${favs.has(c.id) ? 'color:var(--coral)' : ''}" aria-label="Favorite">${ic('heart', 18)}</button><button data-dis="${c.id}" style="${dis.has(c.id) ? 'color:var(--amber)' : ''}" aria-label="Dislike">${ic('alert', 18)}</button></div><div class="lcard"><div class="lv" data-play><img src="${c.poster}" alt=""><span class="low">LOW-RES PREVIEW</span><span class="pl">${ic('play', 22)}</span><span class="chip2">00:00 ${mmss(c.duration)}</span></div><div class="lt"><h4>${esc(c.title)}</h4><div class="sa"><span>Scene analysis</span><label><input type="checkbox" data-tonly>Transcript only</label></div><div class="desc">${esc(c.description)}</div><div class="segs">${c.segments.map((g) => `<div class="seg2"><span>${ts(g.range)}</span>${ic('cc', 14)} ${esc(g.text)}</div>`).join('')}</div></div></div><div class="lact"><button data-pub>${ic('calendar', 16)}Publish on Social</button><button data-xml>${ic('brandkit', 16)}Export XML</button><button data-dl="${c.id}">${ic('download', 16)}Download HD</button><button data-up>${ic('download', 16)}Upscale &amp; download ${ic('bolt', 14, 'b')}</button><div class="gap"></div><button data-edit="${c.id}">${ic('scissors', 16)}Edit clip</button><button data-ai>${ic('wand', 16)}AI tools ${ic('right', 12)}</button><button data-ratio>${ic('phone', 16)}9:16</button><button data-dup>${ic('grid', 16)}Duplicate ${ic('right', 12)}</button></div></div>`).join('');
    $('#pj').innerHTML = toolbar + (layout === 'grid' ? grid : rows) + `<button class="rmw" data-act="upgrade">Remove watermark</button>`;
    if (false) $('#pj').insertAdjacentHTML('beforeend', `<div class="tip"><button class="x2" id="tipx" aria-label="Close">${ic('close', 14)}</button><b>Post to your channels!</b><p>Post your Clip shorts to social media to gain views like other creators!</p><button class="pn">Post now</button></div>`);
    wire();
  };
  const wire = () => {
    $$('[data-lay]').forEach((b) => (b.onclick = () => { history.replaceState({}, '', b.dataset.lay === 'list' ? `/clip/${id}?layout=list` : `/clip/${id}`); renderProject(app, id, shell); }));
    $$('[data-edit]').forEach((b) => (b.onclick = () => edit(clips.find((c) => c.id === b.dataset.edit))));
    $$('[data-dl]').forEach((b) => (b.onclick = () => exportModal(p.id, clips.find((c) => c.id === b.dataset.dl))));
    $$('[data-fav]').forEach((b) => (b.onclick = async () => { if (FREE) return upgradeModal('Favorites'); const f = await api('/favorites', { method: 'POST', body: { clipId: b.dataset.fav } }); favs = new Set(f.clips); draw(); }));
    $$('[data-dis]').forEach((b) => (b.onclick = () => { if (FREE) return upgradeModal('Clip feedback'); dis.has(b.dataset.dis) ? dis.delete(b.dataset.dis) : dis.add(b.dataset.dis); draw(); }));
    $$('[data-sched],[data-pub]').forEach((b) => (b.onclick = () => upgradeModal('Publish on Social')));
    $$('[data-xml],[data-up],[data-ratio]').forEach((b) => (b.onclick = () => upgradeOverlay(null, b.hasAttribute('data-xml') ? 'Export XML' : b.hasAttribute('data-up') ? 'Upscale & download' : 'Aspect ratios')));
    $$('[data-ai],[data-dup]').forEach((b) => (b.onclick = (e) => popover(b, b.hasAttribute('data-ai') ? ['Add B-roll', 'Enhance speech', 'Video dubbing', 'AI viral hook', 'Auto zoom', 'Eye contact correction'].map((l) => ({ label: l })) : [{ label: 'Duplicate clip' }], { onPick: (it) => upgradeModal(it.label) })));
    $$('[data-open]').forEach((b) => (b.onclick = () => { history.replaceState({}, '', `/clip/${id}?layout=list`); renderProject(app, id, shell); }));
    $$('[data-play]').forEach((el) => (el.onclick = () => { const c = clips.find((x) => x.id === el.closest('[data-c]').dataset.c); el.innerHTML = `<video src="${c.video}" autoplay controls loop playsinline poster="${c.poster}"></video>`; }));
    $$('[data-tonly]').forEach((cb) => (cb.onchange = () => { const row = cb.closest('.lt'); $('.desc', row).classList.toggle('hidden', cb.checked); }));
    $('#flt')?.addEventListener('click', (e) => FREE ? upgradeModal('Filters') : popover(e.currentTarget, ['Favorited', 'Disliked', 'Edited', 'Dubbed', 'Not dubbed'].map((l) => ({ label: l })).concat([{ label: 'Clip length: <180s' }]), { multi: true, onPick: (it, items) => { it.on = !it.on; } }));
    $('#srt')?.addEventListener('click', (e) => FREE ? upgradeModal('Sorting') : popover(e.currentTarget, ['Original order', 'Duration'].map((l, i) => ({ label: l, on: i === sort })), { onPick: (it) => { sort = it.label === 'Duration' ? 1 : 0; clips.sort((a, b) => (sort ? b.duration - a.duration : a.rank - b.rank)); draw(); } }));
    $('#more')?.addEventListener('click', (e) => FREE ? upgradeModal('Transcript download') : popover(e.currentTarget, ['Download transcript (TXT)'].map((l) => ({ label: l })), { onPick: (it) => { if (/TXT/.test(it.label)) { const t = clips.map((c) => `${c.title}\n${c.segments.map((g) => ts(g.range) + ' ' + g.text).join('\n')}`).join('\n\n'); const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([t], { type: 'text/plain' })), download: 'transcript.txt' }); a.click(); } else if (/SRT/.test(it.label)) upgradeOverlay(); else toast('Link copied (demo).'); } }));
    $('#upl')?.addEventListener('click', () => upgradeModal('Bulk upload'));
    $('#sel')?.addEventListener('click', () => upgradeModal('Multi-select'));
    $('#tipx')?.addEventListener('click', () => { sessionStorage.setItem('clipTipGone', '1'); $('.tip')?.remove(); });
    $('.tip .pn')?.addEventListener('click', () => toast('Connect a social account to publish. Not available in this demo.'));
  };
  view('', p.title); draw();
}

export function exportModal(pid, clip) {
  let res = '1080p';
  const m = modal('<div id="em"></div>');
  const draw = () => { $('#em', m.el).innerHTML = `<h3>Export clip</h3><p>${esc(clip.title)}</p><div class="rowtog" style="margin-bottom:12px">${['720p', '1080p'].map((r) => `<button class="opt ${res === r ? 'on' : ''}" data-res="${r}">${r}</button>`).join('')}</div><p style="font-size:12px">Free plan exports include a watermark.</p><div class="row"><button class="btn-dark" data-x>Cancel</button><button class="btn-white" style="height:40px" id="go">Export</button></div>`; $$('[data-res]', m.el).forEach((b) => (b.onclick = () => { res = b.dataset.res; draw(); })); $('[data-x]', m.el).onclick = m.close; $('#go', m.el).onclick = run; };
  const run = async () => {
    $('#em', m.el).innerHTML = `<h3>Exporting…</h3><p>Rendering your clip at ${res}.</p><div class="progbar"><i id="pb"></i></div>`;
    const bar = (v) => $('#pb', m.el) && ($('#pb', m.el).style.width = v + '%');
    try {
      let r = await api(`/projects/${pid}/clips/${clip.id}/export`, { method: 'POST', body: { resolution: res } });
      if (r.status === 'ready') { let v = 0; const t = setInterval(() => bar((v = Math.min(100, v + 9 + Math.random() * 10))), 250); await new Promise((ok) => setTimeout(ok, 2800)); clearInterval(t); } // demo engine
      while (r.status === 'rendering') { bar(Math.round(r.progress * 100)); await new Promise((ok) => setTimeout(ok, 700)); if (!document.body.contains(m.el)) return; r = await api('/exports/' + r.id); }
      if (r.status !== 'ready') throw new Error(r.message || 'Export failed');
      $('#em', m.el).innerHTML = `<h3>Your clip is ready</h3><p>${esc(r.filename)} · ${r.resolution} · watermark</p><div class="row"><button class="btn-dark" data-x>Close</button><a class="btn-white" style="height:40px;display:grid;place-items:center" href="${r.url}" download="${esc(r.filename)}">Download</a></div>`; $('[data-x]', m.el).onclick = m.close; }
    catch (e) { $('#em', m.el).innerHTML = `<h3>Export failed</h3><p>${esc(e.message)}</p><div class="row"><button class="btn-dark" data-x>Close</button><button class="btn-white" style="height:40px" id="retry">Try again</button></div>`; $('[data-x]', m.el).onclick = m.close; $('#retry', m.el).onclick = run; }
  };
  draw();
}

// ---------- clip editor ----------
// Caption grouping. Keep in sync with groupWords() in server/real-adapter.mjs, which burns the same groups in.
export function groupWords(words, max = 3) {
  const gs = []; let g = [];
  for (const w of words) {
    const prev = g.at(-1);
    if (prev && (g.length >= max || w.s - prev.e > 0.6 || /[.!?]$/.test(prev.w) || g.reduce((n, x) => n + x.w.length, 0) + w.w.length > 18)) { gs.push(g); g = []; }
    g.push(w);
  }
  if (g.length) gs.push(g);
  return gs;
}
export async function renderEditor(app, pid, cid) {
  bindGlobal(app);
  app.innerHTML = `<div class="ed"><div class="ed-top"><a class="back" href="/clip/${esc(pid)}" data-link>${ic('left', 20)}</a><div class="ttl">Loading…</div></div><div style="margin:auto">${ic('refresh', 28, 'spin')}</div></div>`;
  let p; try { p = await api('/projects/' + pid); } catch (e) { app.innerHTML = `<div class="ed"><div class="empty" style="margin:auto"><b>Could not load this clip</b><span>${esc(e.message)}</span><a class="btn-dark" href="/clip/${esc(pid)}" data-link>Back</a></div></div>`; return; }
  const clip = p.clips?.find((c) => c.id === cid);
  if (!clip) { app.innerHTML = `<div class="ed"><div class="empty" style="margin:auto"><b>Clip not found</b><a class="btn-dark" href="/projects" data-link>Back to projects</a></div></div>`; return; }
  // Real clips preview a caption-free render of the clip in its ratio and layout (raw.src) with HTML captions on
  // top, so caption, trim and headline edits show instantly; the server re-renders it only when ratio or layout
  // change, and renders the final file on export. Demo clips keep a free-running clock.
  const e = clip.edit; let tab = 'transcript', vt = e.trim?.[0] || 0, playing = false, last = 0, saveT, groups = null, raw = clip.raw; const L = clip.duration;
  const loadRaw = async () => { if (p.engine !== 'real') return; try { const r = await api(`/projects/${pid}/clips/${cid}/raw`, { method: 'POST' }); if (r.src) raw = r; } catch { toast('Could not prepare the preview'); } };
  $('.ed .ttl').textContent = 'Preparing preview…'; await loadRaw();
  const relayout = async () => { clearTimeout(saveT); $$('#pane .opt').forEach((b) => (b.disabled = true)); toast('Updating preview…'); try { await api(`/projects/${pid}/clips/${cid}`, { method: 'PATCH', body: { edit: e, transcript: clip.transcript, title: clip.title } }); await loadRaw(); } catch { toast('Could not save changes'); } draw(); };
  const seek = (t) => { vt = t; const v = $('#v'); if (raw && v) v.currentTime = raw.offset + t; };
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => api(`/projects/${pid}/clips/${cid}`, { method: 'PATCH', body: { edit: e, transcript: clip.transcript, title: clip.title } }).catch(() => toast('Could not save changes')), 500); };
  const cap = () => CAPTIONS.find((c) => c[0] === e.captionTemplate) || CAPTIONS[0];
  const draw = () => {
    app.innerHTML = `<div class="ed"><div class="ed-top"><a class="back" href="/clip/${esc(pid)}" data-link aria-label="Back">${ic('left', 20)}</a><div class="ttl">${esc(clip.title)}</div><button class="btn-white" style="height:36px;border-radius:10px;font-size:14px" id="exp">${ic('download', 16)}Export</button></div>
    <div class="ed-main"><div class="rail">${[['transcript', 'Transcript', 'type'], ['captions', 'Captions', 'cc'], ['reframe', 'Reframe', 'crop'], ['trim', 'Trim', 'scissors']].map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${ic(i, 20)}${l}</button>`).join('')}</div>
    <div class="pane" id="pane">${pane()}</div>
    <div class="stage"><div class="phone ${e.ratio === '1:1' ? 'r11' : e.ratio === '4:5' ? 'r45' : e.ratio === '16:9' ? 'r169' : ''}"><video id="v" ${raw ? `src="${esc(raw.src)}#t=${(raw.offset + vt).toFixed(2)}" preload="auto"` : `src="${clip.video}" poster="${clip.poster}" loop`} playsinline class="${e.reframe === 'fit' && !raw?.key ? 'fit' : ''}"></video>${e.headline ? `<div class="hl-ov" id="hlov">${esc(clip.title)}</div>` : ''}<div class="cap-ov ${cap()[2]}" id="capov"></div></div>
    <div class="tl"><button id="pp" aria-label="Play">${ic('play', 16)}</button><span class="tm" id="tm">0:00 / ${fmtTime(L).slice(2)}</span><div class="track" id="track"><div class="fr"></div><div class="shade" id="s0"></div><div class="shade" id="s1"></div><div class="handle" id="h0"></div><div class="handle" id="h1"></div><div class="ph" id="ph"></div></div></div></div></div></div>`;
    wire();
  };
  const pane = () => {
    if (tab === 'transcript') return `<h4>Transcript</h4><p style="font-size:12px;margin:0 0 12px;color:var(--muted)">Click a word to remove it from the captions. Click again to restore.</p><div id="words">${clip.transcript.map((w, i) => `<span class="word ${w.del ? 'del' : ''}" data-w="${i}">${esc(w.w)}</span>`).join(' ')}</div>`;
    if (tab === 'captions') return `<h4>Captions</h4><div class="rowtog" style="margin-bottom:16px"><button class="opt ${e.captions !== false ? 'on' : ''}" data-capon="1">On</button><button class="opt ${e.captions === false ? 'on' : ''}" data-capon="0">Off</button></div>${clip.translation ? `<h4>Caption language</h4><div class="rowtog" style="margin-bottom:16px"><button class="opt ${e.showTranslation !== false ? 'on' : ''}" data-tr="1">${esc(clip.translation.lang)}</button><button class="opt ${e.showTranslation === false ? 'on' : ''}" data-tr="0">Original</button></div>` : ''}<h4>Caption template</h4><div class="ptile">${CAPTIONS.map(([id, n, cl]) => `<div class="cap ${e.captionTemplate === id ? 'sel' : ''}" data-cap="${id}"><div class="pv"><span class="cap-ov ${cl}" style="position:static;font-size:14px">To get<br>started</span></div>${n}</div>`).join('')}</div><h4 style="margin-top:20px">Headline</h4><div class="rowtog"><button class="opt ${e.headline ? 'on' : ''}" data-hl="1">On</button><button class="opt ${!e.headline ? 'on' : ''}" data-hl="0">Off</button></div>`;
    if (tab === 'reframe') return `<h4>Aspect ratio</h4><div class="rowtog">${['9:16', '1:1', '4:5', '16:9'].map((r) => `<button class="opt ${e.ratio === r ? 'on' : ''}" data-ratio="${r}">${r}</button>`).join('')}</div><h4 style="margin-top:20px">Layout</h4><p style="font-size:12px;margin:0 0 10px;color:var(--muted)">Fill follows the speaker. Split, Three and Four give each person a panel. ScreenShare and Gameplay put the full frame on top and the camera below.</p><div class="rowtog" style="flex-wrap:wrap">${[['fill', 'Fill'], ['fit', 'Fit'], ['split', 'Split'], ['three', 'Three'], ['four', 'Four'], ['screenshare', 'ScreenShare'], ['gameplay', 'Gameplay']].map(([k, l]) => `<button class="opt ${e.reframe === k ? 'on' : ''}" data-rf="${k}">${l}</button>`).join('')}</div>`;
    return `<h4>Trim</h4><p style="font-size:13px">Drag the white handles under the video. Trimmed range: <b style="color:var(--fg)">${fmtTime(e.trim[0]).slice(2)} – ${fmtTime(e.trim[1]).slice(2)}</b> (${Math.round(e.trim[1] - e.trim[0])}s)</p><button class="btn-dark" id="rst">Reset trim</button>`;
  };
  const loop = (t) => {
    if (!playing) return; const dt = (t - last) / 1000; last = t; const v = $('#v');
    if (raw) { if (v && !v.seeking) vt = v.currentTime - raw.offset; } else vt += dt;
    if (vt >= e.trim[1] || vt < e.trim[0] - 0.25) seek(e.trim[0]); tick(); requestAnimationFrame(loop);
  };
  const tick = () => {
    const pos = (x) => (x / L) * 100; $('#ph').style.left = pos(vt) + '%'; $('#tm').textContent = `${fmtTime(vt).slice(2)} / ${fmtTime(L).slice(2)}`;
    groups ??= groupWords(clip.transcript.filter((w) => !w.del));
    const ct = raw ? vt : vt % (groups.at(-1)?.at(-1).e || 1), simple = cap()[2] === 't-simple', word = (w) => esc(w.w.replace(/[.,;:]+$/, ''));
    const gi = groups.findIndex((g, k) => ct >= g[0].s - 0.05 && ct < Math.min(groups[k + 1]?.[0].s ?? Infinity, g.at(-1).e + 0.35)), g = gi < 0 || e.captions === false ? [] : groups[gi], cur = g.findLast((w) => w.s <= ct) || g[0];
    const tr = clip.translation && e.showTranslation !== false && e.captions !== false ? clip.translation.cues.find((c) => ct >= c.s && ct < c.e && !clip.transcript.slice(c.i0, c.i1 + 1).every((w) => w.del)) : null;
    const ov = $('#capov'); if (tr && ov) { ov.className = 'cap-ov t-simple'; ov.textContent = tr.text; } else if (ov) { ov.className = 'cap-ov ' + cap()[2]; }
    if (ov && !tr) ov.innerHTML = g.map((w) => (w === cur && !simple ? `<em>${word(w)}</em>` : word(w))).join(' ');
    const hl = $('#hlov'); if (hl && raw) hl.style.display = vt - e.trim[0] < 5 ? '' : 'none'; // the burned-in headline shows for the first 5 seconds
    $$('.word').forEach((el) => el.classList.toggle('on', !tr && clip.transcript[+el.dataset.w] === cur));
  };
  const wire = () => {
    const v = $('#v'); playing = false; const setPlay = (on) => { playing = on; $('#pp').innerHTML = ic(on ? 'pause' : 'play', 16); if (on) { v.play().catch(() => {}); last = performance.now(); requestAnimationFrame(loop); } else v.pause(); };
    $('#pp').onclick = () => setPlay(!playing); v.onclick = () => setPlay(!playing);
    const shades = () => { $('#s0').style.cssText = `left:0;width:${(e.trim[0] / L) * 100}%`; $('#s1').style.cssText = `right:0;width:${(1 - e.trim[1] / L) * 100}%`; $('#h0').style.left = `calc(${(e.trim[0] / L) * 100}%)`; $('#h1').style.left = `calc(${(e.trim[1] / L) * 100}% - 12px)`; };
    shades(); tick();
    const track = $('#track');
    const dragH = (id, idx) => $(id).addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); const r = track.getBoundingClientRect(); const mv = (x) => { const t = Math.min(L, Math.max(0, ((x.clientX - r.left) / r.width) * L)); if (idx === 0) e.trim[0] = Math.min(t, e.trim[1] - 3); else e.trim[1] = Math.max(t, e.trim[0] + 3); e.trim = e.trim.map((n) => +n.toFixed(1)); vt = idx === 0 ? e.trim[0] : Math.min(Math.max(vt, e.trim[0]), e.trim[1]); shades(); tick(); if (tab === 'trim') $('#pane').innerHTML = pane(); }; const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); seek(vt); save(); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); });
    dragH('#h0', 0); dragH('#h1', 1);
    track.addEventListener('mousedown', (ev) => { if (ev.target.classList.contains('handle')) return; const r = track.getBoundingClientRect(); seek(Math.min(e.trim[1], Math.max(e.trim[0], ((ev.clientX - r.left) / r.width) * L))); tick(); });
    $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); $('#pane').innerHTML = pane(); paneWire(); }));
    $('#exp').onclick = () => exportModal(pid, { ...clip, title: clip.title });
    paneWire();
  };
  const paneWire = () => {
    $$('[data-w]').forEach((el) => (el.onclick = () => { const w = clip.transcript[+el.dataset.w]; w.del = !w.del; groups = null; el.classList.toggle('del', w.del); save(); tick(); }));
    $$('[data-tr]').forEach((el) => (el.onclick = () => { e.showTranslation = el.dataset.tr === '1'; save(); $('#pane').innerHTML = pane(); paneWire(); tick(); }));
    $$('[data-capon]').forEach((el) => (el.onclick = () => { e.captions = el.dataset.capon === '1'; save(); $('#pane').innerHTML = pane(); paneWire(); tick(); }));
    $$('[data-cap]').forEach((el) => (el.onclick = () => { e.captionTemplate = el.dataset.cap; save(); $('#capov').className = 'cap-ov ' + cap()[2]; $$('[data-cap]').forEach((x) => x.classList.toggle('sel', x === el)); tick(); }));
    $$('[data-hl]').forEach((el) => (el.onclick = () => { e.headline = el.dataset.hl === '1'; save(); draw(); }));
    $$('[data-ratio]').forEach((el) => (el.onclick = () => { e.ratio = el.dataset.ratio; relayout(); }));
    $$('[data-rf]').forEach((el) => (el.onclick = () => { e.reframe = el.dataset.rf; relayout(); }));
    $('#rst')?.addEventListener('click', () => { e.trim = [0, L]; vt = 0; save(); draw(); });
  };
  draw();
}

// ---------- auto-edit result ----------
function autoResult(p, view) {
  const r = p.result, t = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const stats = [[`${t(r.originalDuration)} → ${t(r.duration)}`, 'Length'], r.removedSeconds > 0 ? [`${r.removedSeconds}s`, 'Cut out'] : null, r.pauses ? [r.pauses, 'Pauses trimmed'] : null, r.fillers ? [r.fillers, 'Fillers removed'] : null, r.captions ? ['On', 'Captions'] : null, r.cleanAudio ? ['On', 'Clean audio'] : null].filter(Boolean);
  view(`<div class="auto-res"><div class="ar-player"><video src="${esc(r.video)}" poster="${esc(r.poster)}" controls playsinline></video></div>
    <div class="ar-side"><h2>${esc(r.title)}</h2>${r.headline ? `<p class="ar-head">Headline: <b>${esc(r.headline)}</b></p>` : ''}
    <div class="ar-stats">${stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
    <div class="ar-act"><a class="btn-white" href="${esc(r.video.split('?')[0])}" download="${esc(r.filename)}">${ic('download', 18)}Download video</a><a class="btn-dark" href="/dashboard/auto-edit-footage" data-link>${ic('wand', 16)}Edit another</a></div>
    <p class="ar-note">Free plan downloads include the watermark set by the host.</p></div></div>`, p.title);
}
