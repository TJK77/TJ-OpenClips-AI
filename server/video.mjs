import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { config } from './config.mjs';

const ASPECTS = {
  '9:16': { width: 1080, height: 1920, label: 'Vertical' },
  '16:9': { width: 1920, height: 1080, label: 'Landscape' },
  '1:1': { width: 1080, height: 1080, label: 'Square' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait' },
};

export const aspectDims = (aspect) => ASPECTS[aspect] || ASPECTS['9:16'];
export const ASPECT_KEYS = Object.keys(ASPECTS);

export function run(command, args, { timeout = 900000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} timed out after ${Math.round(timeout / 1000)}s`));
    }, timeout);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      onLine?.(text);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`Could not start ${command}: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}: ${lastErrorLine(stderr)}`));
    });
  });
}

function lastErrorLine(stderr) {
  const lines = String(stderr || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(-2).join(' ') || 'no output';
}

export async function ffmpegAvailable() {
  try {
    await run(config.ffmpeg, ['-version'], { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

let filterCache = null;

export async function ffmpegCapabilities() {
  if (filterCache) return filterCache;
  try {
    const { stdout } = await run(config.ffmpeg, ['-hide_banner', '-filters'], { timeout: 20000 });
    filterCache = {
      subtitles: /\bsubtitles\b/.test(stdout),
      ass: /\bass\b/.test(stdout),
      drawtext: /\bdrawtext\b/.test(stdout),
    };
  } catch {
    filterCache = { subtitles: false, ass: false, drawtext: false };
  }
  return filterCache;
}

export async function probe(input) {
  const { stdout } = await run(
    config.ffprobe,
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', input],
    { timeout: 60000 }
  );
  const data = JSON.parse(stdout || '{}');
  const streams = data.streams || [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  const duration = Number(data.format?.duration || video?.duration || 0);
  const [num, den] = String(video?.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    duration,
    width: Number(video?.width || 0),
    height: Number(video?.height || 0),
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name || null,
    audioCodec: audio?.codec_name || null,
    fps: den ? Math.round((num / den) * 100) / 100 : 0,
    bitrate: Number(data.format?.bit_rate || 0),
    sizeBytes: Number(data.format?.size || 0),
  };
}

export async function extractAudio(input, output) {
  await run(
    config.ffmpeg,
    [
      '-y',
      '-i', input,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-c:a', 'flac',
      '-map_metadata', '-1',
      output,
    ],
    { timeout: 900000 }
  );
  return output;
}

export async function makeThumbnail(input, output, atSeconds = 1) {
  await run(
    config.ffmpeg,
    ['-y', '-ss', String(Math.max(0, atSeconds)), '-i', input, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', output],
    { timeout: 60000 }
  );
  return output;
}

export function formatTimestamp(seconds, comma = false) {
  const total = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const sep = comma ? ',' : '.';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`;
}

/** Builds an SRT cue list from transcript segments (absolute source seconds). */
export function buildSrt(segments, { start = 0, end = Infinity, words = [], maxChars = 42 } = {}) {
  const cues = [];
  const inRange = segments.filter((s) => s.end > start && s.start < end);
  for (const segment of inRange) {
    const segStart = Math.max(start, segment.start);
    const segEnd = Math.min(end, segment.end);
    if (segEnd - segStart < 0.2) continue;
    const wordsInSeg = words.filter((w) => w.start >= segment.start - 0.05 && w.end <= segment.end + 0.05);
    if (wordsInSeg.length >= 2) {
      let chunk = [];
      const flush = () => {
        if (!chunk.length) return;
        cues.push({
          start: Math.max(segStart, chunk[0].start) - start,
          end: Math.min(segEnd, chunk[chunk.length - 1].end) - start,
          text: chunk.map((w) => w.word).join(' ').replace(/\s+([,.!?])/g, '$1').trim(),
        });
        chunk = [];
      };
      for (const word of wordsInSeg) {
        chunk.push(word);
        const length = chunk.map((w) => w.word).join(' ').length;
        const span = word.end - chunk[0].start;
        if (length >= maxChars || span > 3.4) flush();
      }
      flush();
    } else {
      const text = String(segment.text || '').trim();
      if (!text) continue;
      const parts = splitForCues(text, maxChars);
      const span = (segEnd - segStart) / parts.length;
      parts.forEach((part, index) => {
        cues.push({
          start: segStart - start + index * span,
          end: segStart - start + (index + 1) * span,
          text: part,
        });
      });
    }
  }
  return cues
    .filter((c) => c.end > c.start)
    .map((c, i) => `${i + 1}\n${formatTimestamp(c.start, true)} --> ${formatTimestamp(c.end, true)}\n${c.text}\n`)
    .join('\n');
}

function splitForCues(text, maxChars) {
  const words = text.split(/\s+/);
  const parts = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      parts.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length ? parts : [text];
}

export async function writeSrt(path, content) {
  await writeFile(path, content, 'utf8');
  return path;
}

const hexToAss = (hex, alpha = '00') => {
  const clean = String(hex || '#FFFFFF').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, 'F').slice(0, 6);
  const r = full.slice(0, 2);
  const g = full.slice(2, 4);
  const b = full.slice(4, 6);
  return `&H${alpha}${b}${g}${r}`.toUpperCase();
};

function escapeFilterPath(path) {
  return String(path).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function assStyle(style = {}) {
  const size = Math.round(Number(style.size) || 24);
  const alignment = style.position === 'top' ? 8 : style.position === 'center' ? 5 : 2;
  const primary = hexToAss(style.color || '#FFFFFF');
  const outline = style.box ? hexToAss(style.background || '#000000') : hexToAss('#000000');
  const borderStyle = style.box ? 3 : 1;
  const bold = (Number(style.weight) || 700) >= 600 ? -1 : 0;
  const marginV = style.position === 'bottom' ? 90 : 40;
  return [
    `FontName=${style.font || 'DejaVu Sans'}`,
    `FontSize=${size}`,
    `PrimaryColour=${primary}`,
    `OutlineColour=${outline}`,
    `BackColour=${hexToAss(style.background || '#000000', '80')}`,
    `Bold=${bold}`,
    `BorderStyle=${borderStyle}`,
    `Outline=${style.box ? 6 : 2}`,
    `Shadow=0`,
    `Alignment=${alignment}`,
    `MarginV=${marginV}`,
  ].join(',');
}

/**
 * Cuts a real clip, reframes it to the requested aspect ratio, burns subtitles
 * when ffmpeg has the required filters, and optionally overlays a watermark.
 */
export async function renderClip({
  input,
  output,
  start,
  end,
  aspect = '9:16',
  srtPath = null,
  style = {},
  watermark = '',
  onProgress,
}) {
  const { width, height } = aspectDims(aspect);
  const duration = Math.max(0.5, Number(end) - Number(start));
  const caps = await ffmpegCapabilities();
  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    'setsar=1',
  ];
  const notes = [];

  if (srtPath && caps.subtitles) {
    filters.push(`subtitles='${escapeFilterPath(srtPath)}':force_style='${assStyle(style)}'`);
  } else if (srtPath) {
    notes.push('Subtitle burn-in unavailable: this ffmpeg build lacks the subtitles filter.');
  }

  if (watermark && caps.drawtext) {
    const size = Math.round(height / 34);
    filters.push(
      `drawtext=text='${String(watermark).replace(/[':]/g, '')}':fontcolor=white@0.82:fontsize=${size}:x=w-tw-40:y=h-th-56:box=1:boxcolor=black@0.28:boxborderw=${Math.round(size / 2)}`
    );
  } else if (watermark) {
    notes.push('Watermark skipped: this ffmpeg build lacks the drawtext filter.');
  }

  const args = [
    '-y',
    '-ss', String(Math.max(0, Number(start))),
    '-i', input,
    '-t', String(duration),
    '-vf', filters.join(','),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '24',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    '-movflags', '+faststart',
    '-threads', '2',
    '-max_muxing_queue_size', '1024',
    output,
  ];

  await run(config.ffmpeg, args, {
    timeout: 900000,
    onLine: (text) => {
      const match = /time=(\d+):(\d+):(\d+\.\d+)/.exec(text);
      if (match && onProgress) {
        const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        onProgress(Math.min(100, Math.round((seconds / duration) * 100)));
      }
    },
  });

  return { output, width, height, duration, notes };
}

export function engagementScore({ moment, transcript }) {
  const duration = Math.max(1, moment.end - moment.start);
  const segmentText = transcript.segments
    .filter((s) => s.end > moment.start && s.start < moment.end)
    .map((s) => s.text)
    .join(' ');
  const text = `${segmentText} ${moment.title} ${moment.hook}`.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordsPerSecond = words.length / duration;

  const hookWords = ['secret', 'mistake', 'never', 'always', 'why', 'how', 'nobody', 'everyone', 'stop', 'start', 'best', 'worst', 'truth', 'actually', 'because', 'framework', 'rule', 'wrong'];
  const hookHits = hookWords.filter((w) => text.includes(w)).length;

  const durationFit =
    duration >= 15 && duration <= 45 ? 1 : duration < 15 ? 0.72 : duration <= 60 ? 0.9 : 0.6;
  const densityFit = Math.min(1, wordsPerSecond / 2.6);
  const questionFit = /\?/.test(segmentText) ? 1 : 0.75;
  const modelScore = Math.min(100, Math.max(0, Number(moment.score) || 0)) / 100;

  const computed =
    modelScore * 0.5 + densityFit * 0.18 + Math.min(1, hookHits / 3) * 0.14 + durationFit * 0.1 + questionFit * 0.08;

  return {
    score: Math.max(35, Math.min(99, Math.round(computed * 100))),
    metrics: {
      wordsPerSecond: Math.round(wordsPerSecond * 100) / 100,
      hookHits,
      durationFit: Math.round(durationFit * 100) / 100,
      modelScore: Number(moment.score) || 0,
    },
  };
}
