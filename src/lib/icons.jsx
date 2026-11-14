const P = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  video: <><rect x="2" y="6" width="14" height="12" rx="3" /><path d="m16 10 6-3v10l-6-3" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  captions: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 11.5h3.5M7 14.5h6M14 11.5h3" /></>,
  scissors: <><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.2 7.6 20 18M20 6 8.2 16.4" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 11h18" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>,
  chart: <><path d="M4 20V11M10 20V4M16 20v-6M22 20H2" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></>,
  sparkles: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  pause: <><rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.6 2.6L16.2 9" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></>,
  download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  edit: <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z" />,
  trash: <><path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.6 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.5 6.7A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9M17 17l2-2M14 14l2-2" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.4 6.4" /><path d="M20 4v7h-7" /></>,
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18z" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6" /></>,
  'arrow-right': <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  'arrow-left': <><path d="M20 12H5M11 6l-6 6 6 6" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  mic: <><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></>,
  crop: <path d="M6 2v16h16M2 6h16v16" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 18 18z" />,
  shield: <><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  alert: <><path d="M12 3 2 21h20z" /><path d="M12 9v5M12 17.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  wand: <><path d="M4 20 16 8" /><path d="m14 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" /><path d="m19 13 .7 1.8L21.5 15l-1.8.7L19 17.5l-.7-1.8L16.5 15l1.8-.7z" /></>,
  hash: <path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />,
  send: <><path d="M21 3 3 10.5l7 2.5 2.5 7z" /><path d="m10 13 5-5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  volume: <><path d="M4 10v4h3l5 4V6L7 10z" /><path d="M16 9a4 4 0 0 1 0 6" /></>,
  more: <><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" /></>,
  star: <path d="m12 3 2.7 6 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3.2 1.3-6.2L3 9.7l6.3-.7z" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  sliders: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>,
  wifi: <><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" /><circle cx="12" cy="19" r="1" fill="currentColor" /></>,
  credit: <><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></>,
  maximize: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />,
  'arrow-right': <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  'arrow-left': <><path d="M20 12H5" /><path d="m11 18-6-6 6-6" /></>,
  'arrow-up-right': <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9" /><path d="M6.3 7.8A17.6 17.6 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  minus: <path d="M5 12h14" />,
  drag: <><circle cx="9" cy="6" r="1.2" fill="currentColor" /><circle cx="15" cy="6" r="1.2" fill="currentColor" /><circle cx="9" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="12" r="1.2" fill="currentColor" /><circle cx="9" cy="18" r="1.2" fill="currentColor" /><circle cx="15" cy="18" r="1.2" fill="currentColor" /></>,
  google: <g stroke="none"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.4 5.4 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76z" /><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" /></g>,
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {P[name] || P.sparkles}
    </svg>
  );
}

const BRAND = {
  instagram: <><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" /></>,
  tiktok: <path d="M16.6 2h-3.2v13.2a2.8 2.8 0 1 1-2.8-2.8c.3 0 .6 0 .9.1V9.2a6.1 6.1 0 1 0 5.1 6V8.6a6.4 6.4 0 0 0 3.7 1.2V6.6a3.4 3.4 0 0 1-3.7-3.4z" fill="currentColor" />,
  youtube: <><rect x="2" y="5" width="20" height="14" rx="4.5" fill="currentColor" /><path d="m10 9.2 5 2.8-5 2.8z" fill="#070b18" /></>,
  linkedin: <><rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="currentColor" /><path d="M7 10v7M7 7.2v.1M11 17v-4a2.4 2.4 0 0 1 4.8 0v4" stroke="#070b18" strokeWidth="2.1" strokeLinecap="round" fill="none" /></>,
  x: <path d="M3 3h4.6l5 6.7L18.4 3H21l-6.9 8.1L21.4 21h-4.6l-5.3-7.1L4.9 21H2.2l7.4-8.7z" fill="currentColor" />,
  facebook: <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.5v3h2.7V21z" fill="currentColor" />,
  threads: <path d="M12.4 21c-3 0-5.2-1-6.6-2.9C4.5 16.3 3.8 14 3.8 12s.7-4.3 2-5.9C7.2 4.2 9.4 3.2 12.3 3.2c2.7 0 4.9 1 6.3 2.9.7.9 1.2 2 1.5 3.2l-1.9.5c-.2-1-.6-1.8-1.1-2.5-1-1.3-2.6-2-4.8-2-2.3 0-4 .8-5.1 2.2-1 1.2-1.5 2.8-1.5 4.5s.5 3.3 1.5 4.5c1.1 1.4 2.8 2.2 5.1 2.2 1.6 0 2.9-.4 3.8-1.2.9-.8 1.4-1.9 1.3-3.1-.1-1.3-.8-2.3-2.2-2.7.2-1.7-.3-3-1.3-3.8-.7-.6-1.7-.9-2.8-.9-1.5 0-2.8.6-3.6 1.7l1.6 1.1c.5-.7 1.3-1 2-1 .7 0 1.2.2 1.5.5.5.5.6 1.2.5 1.9-.5-.1-1-.2-1.5-.2-1.2 0-2.3.4-3.1 1.2-.7.7-1.1 1.6-1.1 2.6 0 1.9 1.5 3.3 3.6 3.3 1.4 0 2.6-.6 3.4-1.7.6-.8.9-1.9.8-3.1 1.6.7 2.5 2 2.6 3.9.2 2.1-1 3.9-2.3 4.9-1.4 1.1-3.3 1.6-5.4 1.6z" fill="currentColor" />,
  pinterest: <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.5 0 .9-.6 2.2-.9 3.5-.3 1.1.5 2 1.6 2 2 0 3.5-2.1 3.5-5.1 0-2.7-1.9-4.6-4.7-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 .9 2.6.1.1.1.2.1.3l-.3 1.4c0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.6 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.3l-.7 2.8c-.3 1-1 2.3-1.5 3.1A10 10 0 1 0 12 2z" fill="currentColor" />,
  buffer: <><rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" /><path d="M7 12h10M7 8.2h10M7 15.8h10" stroke="#070b18" strokeWidth="2.2" strokeLinecap="round" /></>,
};

export function BrandIcon({ name, size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {BRAND[name] || BRAND.instagram}
    </svg>
  );
}
