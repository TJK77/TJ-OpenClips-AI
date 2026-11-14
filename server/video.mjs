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

const AUDIO_CODECS = {
  '.mp3': ['-c:a', 'libmp3lame', '-b:a', '32k'],
  '.m4a': ['-c:a', 'aac', '-b:a', '32k'],
  '.flac': ['-c:a', 'flac'],
  '.wav': ['-c:a', 'pcm_s16le'],
  '.ogg': ['-c:a', 'libopus', '-b:a', '24k'],
};

/**
 * Extracts a mono 16 kHz track for speech-to-text. The container is chosen from
 * the output extension so the muxer and codec always agree — writing a FLAC
 * stream into an .m4a file makes ffmpeg abort with a muxer error.
 * Defaults to 32 kbps mono MP3 (~14 MB/hour) so long videos stay inside
 * Groq's free-tier 25 MB upload limit.
 */
export async function extractAudio(input, output) {
  const dot = output.lastIndexOf('.');
  const ext = dot >= 0 ? output.slice(dot).toLowerCase() : '.mp3';
  const codec = AUDIO_CODECS[ext] || AUDIO_CODECS['.mp3'];
  await run(
    config.ffmpeg,
    [
      '-y',
      '-i', input,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      ...codec,
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
/**
 * Key-free moment detection.
 *
 * Uses ffmpeg's silencedetect filter to find where speech actually starts and
 * stops in the extracted audio, then proposes the longest speech runs as clip
 * candidates. This is honest about its limits: it finds speech boundaries, not
 * meaning. It exists so a real, rendered MP4 can be produced without any AI
 * credential — the AI path remains the default whenever a key is configured.
 */
export async function detectSpeechMoments(audioPath, { duration = 0, minSec = 12, maxSec = 60, count = 6 } = {}) {
  let stderr = '';
  try {
    const result = await run(
      config.ffmpeg,
      ['-hide_banner', '-nostdin', '-i', audioPath, '-af', 'silencedetect=noise=-32dB:d=0.55', '-f', 'null', '-'],
      { timeout: 180000 }
    );
    stderr = result.stderr;
  } catch (error) {
    // ffmpeg writes filter output to stderr and can exit non-zero on odd input;
    // whatever it reported is still usable evidence.
    stderr = error.stderr || String(error.message || '');
  }

  const total = Number(duration) || (await probe(audioPath).then((m) => m.duration).catch(() => 0));
  if (!total) return [];

  const silences = [];
  let open = null;
  for (const line of String(stderr).split('\n')) {
    const startMatch = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (startMatch) {
      open = Math.max(0, Number(startMatch[1]));
      continue;
    }
    const endMatch = line.match(/silence_end:\s*([\d.]+)/);
    if (endMatch && open !== null) {
      silences.push([open, Math.min(Number(endMatch[1]), total)]);
      open = null;
    }
  }
  if (open !== null) silences.push([open, total]);
  silences.sort((a, b) => a[0] - b[0]);

  // Speech is everything the silence detector did not claim.
  const runs = [];
  let cursor = 0;
  for (const [start, end] of silences) {
    if (start - cursor > 1.2) runs.push([cursor, Math.min(start, total)]);
    cursor = Math.max(cursor, end);
  }
  if (total - cursor > 1.2) runs.push([cursor, total]);
  if (!runs.length && total > 1) runs.push([0, total]);

  // Split runs that exceed the platform maximum into evenly sized windows.
  const windows = [];
  for (const [start, end] of runs) {
    const length = end - start;
    if (length < minSec) continue;
    if (length <= maxSec) {
      windows.push([start, end]);
      continue;
    }
    const pieces = Math.ceil(length / maxSec);
    const size = length / pieces;
    for (let i = 0; i < pieces; i += 1) {
      const from = start + i * size;
      windows.push([from, Math.min(from + size, end)]);
    }
  }

  return windows
    .map(([start, end], index) => {
      const length = Math.round((end - start) * 10) / 10;
      // Longer uninterrupted speech tends to hold a complete thought; treat that
      // as the only signal available without an AI provider.
      const completeness = Math.min(1, length / Math.min(maxSec, 45));
      const score = Math.round((0.45 + completeness * 0.4) * 100) / 100;
      return {
        index,
        start: Math.round(start * 10) / 10,
        end: Math.round(end * 10) / 10,
        duration: length,
        score: Math.min(score, 0.92),
        title: `Speech segment ${index + 1} (${length}s)`,
        reason: 'Longest continuous speech run detected in the audio.',
        metrics: { speech: 1, completeness: Math.round(completeness * 100) / 100 },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.start - b.start)
    .map((moment, index) => ({ ...moment, index }));
}

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
