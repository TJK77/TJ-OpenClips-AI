import { join } from 'node:path';
import { unlink, stat } from 'node:fs/promises';
import { config, dirs } from './config.mjs';
import * as store from './store.mjs';
import {
  probe,
  extractAudio,
  buildSrt,
  writeSrt,
  renderClip,
  makeThumbnail,
  engagementScore,
  aspectDims,
  ffmpegAvailable,
} from './video.mjs';
import { groqTranscribe, analyseTranscript, ProviderError } from './providers.mjs';
import { decryptSecret } from './security.mjs';

export const STAGES = [
  { key: 'import', label: 'Importing video' },
  { key: 'extract', label: 'Extracting audio' },
  { key: 'transcribe', label: 'Transcribing speech' },
  { key: 'analyse', label: 'Analysing content' },
  { key: 'detect', label: 'Detecting interesting moments' },
  { key: 'rank', label: 'Ranking highlights' },
  { key: 'render', label: 'Generating clips' },
  { key: 'caption', label: 'Adding captions' },
  { key: 'export', label: 'Preparing exports' },
];

export const DEFAULT_CAPTION_STYLE = {
  name: 'Bold viral',
  font: 'DejaVu Sans',
  size: 30,
  weight: 800,
  color: '#FFFFFF',
  highlight: '#A855F7',
  background: '#000000',
  box: false,
  position: 'bottom',
  animation: 'pop',
};

const queue = [];
let active = 0;

export function queueSize() {
  return { queued: queue.length, active };
}

export function providerKey(userId, provider) {
  const record = store
    .where('credentials', (c) => c.userId === userId && c.provider === provider)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0];
  if (!record?.encryptedKey) return null;
  return decryptSecret(record.encryptedKey);
}

export function publicJob(job) {
  return job;
}

function stageState(job, key, status, detail) {
  const stages = job.stages.map((stage) => {
    if (stage.key !== key) return stage;
    const next = { ...stage, status };
    if (detail !== undefined) next.detail = detail;
    if (status === 'running') next.startedAt = new Date().toISOString();
    if (status === 'done' || status === 'failed') next.finishedAt = new Date().toISOString();
    return next;
  });
  return stages;
}

function update(job, patch) {
  return store.update('jobs', job.id, patch);
}

function failJob(jobId, error, stageKey) {
  const job = store.get('jobs', jobId);
  if (!job) return;
  const message = error instanceof ProviderError ? error.message : error.message || 'Processing failed.';
  const hint = error?.hint || null;
  const stages = stageKey
    ? stageState(job, stageKey, 'failed', message).map((stage) =>
        stage.status === 'running' ? { ...stage, status: 'failed' } : stage
      )
    : job.stages;
  update(job, {
    status: 'failed',
    error: message,
    errorHint: hint,
    errorStage: stageKey || job.stage,
    stages,
    finishedAt: new Date().toISOString(),
  });
  if (job.videoId) store.update('videos', job.videoId, { status: 'failed', error: message });
}

export function enqueue(jobId) {
  queue.push(jobId);
  pump();
}

function pump() {
  while (active < config.maxConcurrentJobs && queue.length) {
    const jobId = queue.shift();
    active += 1;
    runJob(jobId)
      .catch((error) => {
        console.error('[jobs] unhandled failure', error);
        failJob(jobId, error);
      })
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

export async function runJob(jobId) {
  const job = store.get('jobs', jobId);
  if (!job) return;
  const video = store.get('videos', job.videoId);
  if (!video) {
    failJob(jobId, new Error('The source video no longer exists.'));
    return;
  }

  update(job, {
    status: 'running',
    error: null,
    errorHint: null,
    errorStage: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    progress: 2,
    stage: 'import',
    stages: STAGES.map((s) => ({ ...s, status: 'pending' })),
  });

  let current = 'import';
  try {
    /* 1 — validate the source */
    current = 'import';
    update(job, { stages: stageState(job, 'import', 'running'), stage: 'import', progress: 4 });
    // Fail with a precise reason instead of a raw spawn error: the video engine
    // (ffmpeg) is an optional part of this image, so a deployment can run the
    // real API, AI providers and Buffer integration without being able to render.
    if (!(await ffmpegAvailable())) {
      throw Object.assign(
        new Error(
          'Video processing is unavailable in this deployment because the ffmpeg video engine is not installed in the container image.'
        ),
        {
          hint:
            'Rendering needs an image built with INSTALL_FFMPEG=1 (the platform image scanner currently blocks ffmpeg because of an unactionable glib advisory) or a host that already provides ffmpeg. AI providers, projects, clips and Buffer publishing keep working meanwhile.',
        }
      );
    }
    const info = await stat(video.path);
    if (!info.size) throw new Error('The uploaded file is empty.');
    const meta = await probe(video.path);
    if (!meta.hasAudio) {
      throw new Error('This video has no audio track, so there is no speech to transcribe.');
    }
    store.update('videos', video.id, {
      status: 'analysing',
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      hasAudio: meta.hasAudio,
      probedAt: new Date().toISOString(),
    });
    update(job, {
      stages: stageState(job, 'import', 'done', `${meta.width}×${meta.height}, ${Math.round(meta.duration)}s`),
      progress: 8,
    });

    /* 2 — audio extraction */
    current = 'extract';
    update(job, { stages: stageState(job, 'extract', 'running'), stage: 'extract', progress: 10 });
    let audioPath = video.audioPath && (await exists(video.audioPath)) ? video.audioPath : null;
    if (!audioPath) {
      audioPath = join(dirs.audio, `${video.id}.mp3`);
      await extractAudio(video.path, audioPath);
      store.update('videos', video.id, { audioPath });
    }
    const audioInfo = await stat(audioPath);
    update(job, {
      stages: stageState(job, 'extract', 'done', `${(audioInfo.size / 1048576).toFixed(1)} MB mono 16 kHz`),
      progress: 16,
    });

    /* 3 — transcription with Groq */
    current = 'transcribe';
    update(job, { stages: stageState(job, 'transcribe', 'running'), stage: 'transcribe', progress: 18 });
    const groqKey = providerKey(job.userId, 'groq');
    if (!groqKey) {
      throw Object.assign(new Error('Groq is not configured. Add a Groq API key in AI Models so audio can be transcribed.'), {
        hint: 'Open AI Models, paste your Groq key and press Test connection first.',
      });
    }
    let transcript = null;
    if (job.transcript && job.transcript.segments?.length) {
      transcript = job.transcript;
    } else {
      transcript = await groqTranscribe(groqKey, {
        audioPath,
        filename: `${video.id}.mp3`,
        model: job.transcriptionModel || 'whisper-large-v3-turbo',
        language: job.language || 'auto',
      });
    }
    update(job, {
      transcript,
      stages: stageState(
        job,
        'transcribe',
        'done',
        `${transcript.segments.length} segments · ${transcript.language}${transcript.wordTimings ? ' · word timings' : ''}`
      ),
      progress: 34,
    });

    /* 4 — AI analysis */
    current = 'analyse';
    update(job, { stages: stageState(job, 'analyse', 'running'), stage: 'analyse', progress: 36 });
    const analysisKey = providerKey(job.userId, job.analysisProvider);
    if (!analysisKey) {
      throw Object.assign(
        new Error(`${job.analysisProvider} is not configured. Add an API key in AI Models to analyse the transcript.`),
        { hint: 'Open AI Models, save a key for this provider and test the connection.' }
      );
    }
    const analysis = await analyseTranscript({
      provider: job.analysisProvider,
      apiKey: analysisKey,
      model: job.model,
      transcript,
      options: {
        targetClips: job.targetClips || config.clipLimitPerJob,
        minSec: job.minSec || 15,
        maxSec: job.maxSec || 60,
        style: job.captionStyle?.name,
      },
    });
    update(job, {
      stages: stageState(job, 'analyse', 'done', `${analysis.moments.length} candidate moments · ${analysis.model}`),
      progress: 50,
      analysisSummary: analysis.summary,
      topics: analysis.topics,
    });

    /* 5 — moment detection (validate against the real timeline) */
    current = 'detect';
    update(job, { stages: stageState(job, 'detect', 'running'), stage: 'detect', progress: 52 });
    const duration = meta.duration || transcript.segments.at(-1)?.end || 0;
    const valid = analysis.moments
      .map((m) => ({
        ...m,
        start: Math.max(0, Math.min(m.start, Math.max(0, duration - 4))),
        end: Math.max(0, Math.min(m.end, duration)),
      }))
      .filter((m) => m.end - m.start >= 5);
    if (!valid.length) throw new Error('No usable clip moments were found inside this video.');
    update(job, {
      stages: stageState(job, 'detect', 'done', `${valid.length} moments inside the ${Math.round(duration)}s timeline`),
      progress: 58,
    });

    /* 6 — ranking (deterministic scoring blend) */
    current = 'rank';
    update(job, { stages: stageState(job, 'rank', 'running'), stage: 'rank', progress: 60 });
    const ranked = valid
      .map((moment) => {
        const { score, metrics } = engagementScore({ moment, transcript });
        return { ...moment, score, metrics };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, job.targetClips || config.clipLimitPerJob));
    update(job, {
      stages: stageState(job, 'rank', 'done', `Top ${ranked.length} by blended score`),
      progress: 64,
    });

    /* 7 — real ffmpeg rendering */
    current = 'render';
    update(job, { stages: stageState(job, 'render', 'running'), stage: 'render', progress: 66 });
    store.removeWhere('clips', (clip) => clip.jobId === job.id);
    const style = { ...DEFAULT_CAPTION_STYLE, ...(job.captionStyle || {}) };
    const dims = aspectDims(job.aspect);
    const created = [];
    const renderNotes = [];

    for (let index = 0; index < ranked.length; index += 1) {
      const moment = ranked[index];
      const clipId = store.newId('clip');
      const srtPath = join(dirs.subs, `${clipId}.srt`);
      const srt = buildSrt(transcript.segments, {
        start: moment.start,
        end: moment.end,
        words: transcript.words || [],
      });
      await writeSrt(srtPath, srt);

      const output = join(dirs.clips, `${clipId}.mp4`);
      const result = await renderClip({
        input: video.path,
        output,
        start: moment.start,
        end: moment.end,
        aspect: job.aspect,
        srtPath,
        style,
        watermark: job.watermark || '',
        onProgress: (percent) => {
          const overall = 66 + ((index + percent / 100) / ranked.length) * 24;
          update(job, { progress: Math.min(90, Math.round(overall)) });
        },
      });
      if (result.notes?.length) renderNotes.push(...result.notes);

      const thumbPath = join(dirs.thumbs, `${clipId}.jpg`);
      await makeThumbnail(output, thumbPath, Math.min(1, (moment.end - moment.start) / 3));

      const clip = store.insert('clips', {
        id: clipId,
        userId: job.userId,
        videoId: video.id,
        jobId: job.id,
        title: moment.title,
        hook: moment.hook,
        caption: moment.caption,
        hashtags: moment.hashtags,
        reason: moment.reason,
        speaker: moment.speaker,
        start: moment.start,
        end: moment.end,
        duration: Math.round((moment.end - moment.start) * 10) / 10,
        score: moment.score,
        metrics: moment.metrics,
        aspect: job.aspect,
        width: result.width,
        height: result.height,
        status: 'ready',
        path: output,
        thumbPath,
        srtPath,
        captionStyle: style,
        sourceTitle: video.title,
      });
      created.push(clip);
      update(job, {
        stages: stageState(job, 'render', 'running', `${index + 1}/${ranked.length} rendered`),
      });
    }
    update(job, {
      stages: stageState(job, 'render', 'done', `${created.length} clips rendered with ffmpeg`),
      progress: 90,
    });

    /* 8 — captions */
    current = 'caption';
    update(job, { stages: stageState(job, 'caption', 'running'), stage: 'caption', progress: 91 });
    const captioned = created.filter((c) => c.srtPath).length;
    update(job, {
      stages: stageState(job, 'caption', 'done', `${captioned} subtitle tracks burned in (${style.name})`),
      progress: 95,
    });

    /* 9 — exports */
    current = 'export';
    update(job, { stages: stageState(job, 'export', 'running'), stage: 'export', progress: 96 });
    store.update('videos', video.id, { status: 'ready', clipCount: created.length });
    const notes = [...new Set(renderNotes)];
    update(job, {
      status: 'completed',
      stage: 'export',
      progress: 100,
      stages: stageState(job, 'export', 'done', `${created.length} MP4 files ready (${dims.width}×${dims.height})`),
      clipIds: created.map((c) => c.id),
      notes,
      finishedAt: new Date().toISOString(),
    });

    /* storage cleanup — the audio intermediate is not needed after success */
    if (audioPath) {
      unlink(audioPath).catch(() => {});
      store.update('videos', video.id, { audioPath: null });
    }
  } catch (error) {
    console.error('[jobs] failed at stage', current, '-', error.message);
    failJob(jobId, error, current);
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function resumeQueuedJobs() {
  const pending = store
    .where('jobs', (job) => job.status === 'queued' || job.status === 'running')
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  for (const job of pending) {
    if (job.status === 'running') {
      store.update('jobs', job.id, {
        status: 'failed',
        error: 'Processing was interrupted when the server restarted.',
        errorHint: 'Press Retry to run this job again.',
      });
      continue;
    }
    enqueue(job.id);
  }
}
