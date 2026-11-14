// Picks the colour theme before the page paints: saved choice, else the system setting.
(function () {
  var t = null;
  try { t = localStorage.getItem('clip_theme'); } catch (e) {}
  if (t !== 'dark' && t !== 'light') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  window.clipTheme = function (next) {
    if (!next) next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('clip_theme', next); } catch (e) {}
    return next;
  };
})();
