# Oclip Free by coding180

> **Free edition.** Clipping, download and the clip editor are unlocked. Every other feature shows a "Get Oclip Premium" message. Set your sales page in `public/js/edition.js` (`PREMIUM_URL`). The premium options are also forced to defaults on the server (`server/server.mjs`), so the limits cannot be bypassed from the browser. Runs on port 4571 so it can sit beside the Premium edition (4570).


AI video clipping: turn a long video into short, captioned clips. Self-hosted, plain ES modules, no dependencies.

> For educational purposes only. An independent re-implementation, not affiliated with or endorsed by the product it was modelled on.

## Install

1. Install [Node.js](https://nodejs.org) 20 or newer (the launchers offer to help).
2. Start it: double-click **Start Clip.bat** (Windows) or **Start Clip.command** (Mac, first time right-click, Open). Step-by-step guide for non-technical users: [INSTALL.md](INSTALL.md). Developers: `npm start`.
3. Open http://localhost:4571  (no sign-in). With no API keys it runs in demo mode (simulated processing, synthetic sample clips).
4. To clip real videos: `brew install ffmpeg-full yt-dlp`, then `cp .env.example .env` and add `GROQ_API_KEY` (speech to text) and `OPENROUTER_API_KEY` (picks the moments). Keys can also be pasted at http://localhost:4571/admin (the console prints a first-run setup code).

The server listens on `127.0.0.1` only. Set `HOST=0.0.0.0` only behind a reverse proxy (and `TRUST_PROXY=1`).

## Features

- Dashboard, link or upload, options step (range, language, genre, ratio, clip length, caption templates), live processing card.
- Results grid and list with scores, titles and descriptions; clip editor with transcript, captions, trim, reframe and export (720p / 1080p).
- Real engine: yt-dlp, Groq Whisper (with free-service fail-over), OpenRouter moment picking with free/paid model fail-over, ffmpeg cut, reframe and burned-in captions, optional speaker tracking.
- Settings page for keys, models and projects; light and dark themes. Built for one person on their own computer: no sign-in, credits or usage limits.
- Stubs: plans and payments, posting to channels, several sidebar pages.

## Settings page and AI models

Open `http://localhost:4571/admin`. There is no sign-in, because the app only listens on your own computer. Settings are saved in `data/settings.json` (chmod 600, gitignored) and override `.env`.

- **AI models**: set the Groq and OpenRouter keys, then switch between **Free** and **Paid** models. On the free tier the app automatically moves to the next free model when one is rate limited, out of tokens, gone or returns a bad answer (cool-downs: 2 min, 1 h, 5 min). You can pin a preferred model, cap the paid price and set max tries. Test buttons check each key and model.
- **Rendering**: speaker tracking on/off, max export size, watermark text, caption font, yt-dlp proxy.
- **Projects**: list and delete projects.

## Reframe and layouts

Fill follows the main speaker using a face detector (OpenCV YuNet). Install it once with `tools/setup-tracking.sh` (creates `.venv`; or set `TRACK_PYTHON`). Layouts: Fill, Fit (blurred background), Split, Three, Four, ScreenShare, Gameplay. The layout is chosen automatically per clip from the faces found and can be changed in the editor.

Not verified on real footage: Three/Four/Gameplay layouts, videos over 10 minutes, non-English speech. There is no audio-based active-speaker detection (the main speaker is the largest steady face).

## Look and naming (phase 2)

The UI uses the coding180 design tokens (cream surfaces, ink text, violet primary, coral/teal/amber accents) with Sora and Plus Jakarta Sans, self-hosted in `public/fonts/`. Change colours in the `:root` block at the top of `public/css/app.css` (the admin page has its own small `:root`). Product terms are our own: Presets, Smart Clip / Talk Clip, Brand style. Environment variables use the `CLIP_` prefix (`CLIP_ENGINE=demo` forces the demo engine, `CLIP_DEMO_PROCESS_MS`, `CLIP_CAPTION_FONT`). Demo sign-in: `demo` / `clip-demo` (change it in the admin).

## Dark theme and unfinished features

The sun/moon button in the top bar (and on the sign-in page and admin) switches between light and dark. The first visit follows the system setting; the choice is saved in `localStorage` (`clip_theme`). Dark tokens live in the `:root[data-theme="dark"]` block of `public/css/app.css`. The dark theme is neutral grey with a teal accent and has no purple; the light theme keeps the coding180 violet.

Features that are not built yet (Auto-edit footage, Open editor, the Recipes-style chips, B-roll, dubbing, translation, speech cleanup, upscale, publishing, brand style and similar) stay visible but greyed out and cannot be clicked. The list is in `public/js/soon.js`; delete a selector there when a feature goes live.

## Credits

Developed by **[coding180](https://coding180.com/forum)**, built with the REA (reverse-engineer-anything) tool as a clean-room re-implementation. Sample videos are generated with ffmpeg and contain no third-party footage.

## Forum, more apps and contact

- Community forum: https://coding180.com/forum
- More reverse-engineered tools: https://coding180.com/forum/reverse-engineer
- Contact: https://coding180.com/contact

Licensed under the [MIT License](LICENSE).
