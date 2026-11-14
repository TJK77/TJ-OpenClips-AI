import { readFile } from 'node:fs/promises';

/**
 * Real provider calls. Every function here performs an authenticated HTTP
 * request; nothing returns a canned "success". Errors carry the provider's own
 * message so the UI can show what actually happened. API keys are never logged
 * or echoed back to the browser.
 */

export class ProviderError extends Error {
  constructor(provider, status, detail, hint) {
    super(detail || `${provider} request failed (${status})`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.status = status;
    this.detail = detail;
    this.hint = hint;
  }
}

const UA = 'TJ-OpenClips-AI-Studio/2.0';

function cleanDetail(data, text) {
  const raw =
    data?.error?.message ||
    data?.error?.error?.message ||
    data?.message ||
    (typeof data?.error === 'string' ? data.error : '') ||
    (text || '').slice(0, 400);
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function call(provider, url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeout || 180000),
      headers: { 'user-agent': UA, ...(options.headers || {}) },
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw new ProviderError(
      provider,
      0,
      timedOut ? `${provider} did not respond in time.` : `Could not reach ${provider}: ${error.message}`,
      timedOut ? 'The request timed out. Try a shorter video or retry.' : 'Check the server network and retry.'
    );
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = cleanDetail(data, text);
    const hint =
      response.status === 401 || response.status === 403
        ? 'The API key was rejected. Check that it is valid and has access to this model.'
        : response.status === 429
          ? 'Rate limit reached for this key. Wait for the provider quota to reset or use a smaller model.'
          : response.status === 404
            ? 'The selected model is not available to this key.'
            : response.status >= 500
              ? 'The provider reported a server error. Retry shortly.'
              : undefined;
    throw new ProviderError(provider, response.status, detail, hint);
  }
  return data;
}

/* ------------------------------------------------------------------ Groq */

const GROQ_BASE = 'https://api.groq.com/openai/v1';

export const GROQ_MODELS = ['whisper-large-v3-turbo', 'whisper-large-v3', 'distil-whisper-large-v3-en'];

export async function groqTest(apiKey) {
  const started = Date.now();
  const data = await call('Groq', `${GROQ_BASE}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
    timeout: 20000,
  });
  const ids = (data?.data || []).map((m) => m.id);
  const whisper = ids.filter((id) => /whisper/i.test(id));
  return {
    ok: true,
    latencyMs: Date.now() - started,
    models: whisper.length ? whisper : GROQ_MODELS,
    note: `${ids.length} models visible to this key.`,
  };
}

export async function groqTranscribe(apiKey, { audioPath, filename, model, language }) {
  const buffer = await readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'audio/flac' }), filename || 'audio.flac');
  form.append('model', model || 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');

  const attempt = async (withWords) => {
    const body = new FormData();
    body.append('file', new Blob([buffer], { type: 'audio/flac' }), filename || 'audio.flac');
    body.append('model', model || 'whisper-large-v3-turbo');
    body.append('response_format', 'verbose_json');
    body.append('temperature', '0');
    if (withWords) body.append('timestamp_granularities[]', 'word');
    if (language && language !== 'auto') body.append('language', language);
    return call('Groq', `${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body,
      timeout: 300000,
    });
  };

  let data;
  try {
    data = await attempt(true);
  } catch (error) {
    if (error.status === 400) data = await attempt(false);
    else throw error;
  }

  const segments = Array.isArray(data?.segments)
    ? data.segments.map((s) => ({
        start: Number(s.start) || 0,
        end: Number(s.end) || Number(s.start) + 2,
        text: String(s.text || '').trim(),
      }))
    : [];

  const words = Array.isArray(data?.words)
    ? data.words.map((w) => ({
        word: String(w.word || '').trim(),
        start: Number(w.start) || 0,
        end: Number(w.end) || 0,
      }))
    : [];

  const text = String(data?.text || segments.map((s) => s.text).join(' ')).trim();
  if (!text) {
    throw new ProviderError('Groq', 200, 'Transcription returned no speech for this audio.', 'The video may have no spoken audio, or the audio track is silent.');
  }

  return {
    text,
    segments: segments.length ? segments : [{ start: 0, end: Math.max(1, Math.round(text.length / 15)), text }],
    words,
    language: data?.language || language || 'unknown',
    duration: Number(data?.duration) || null,
    model: model || 'whisper-large-v3-turbo',
    wordTimings: words.length > 0,
  };
}

/* ------------------------------------------------------------ OpenRouter */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export async function openrouterTest(apiKey) {
  const started = Date.now();
  const keyInfo = await call('OpenRouter', `${OPENROUTER_BASE}/key`, {
    headers: { authorization: `Bearer ${apiKey}` },
    timeout: 20000,
  });
  const models = await call('OpenRouter', `${OPENROUTER_BASE}/models`, { timeout: 20000 });
  const free = (models?.data || []).filter(
    (m) => Number(m?.pricing?.prompt ?? 1) === 0 && Number(m?.pricing?.completion ?? 1) === 0
  );
  return {
    ok: true,
    latencyMs: Date.now() - started,
    freeModels: free.map((m) => m.id).slice(0, 40),
    usage: keyInfo?.data
      ? { used: keyInfo.data.usage ?? null, limit: keyInfo.data.limit ?? null, freeTier: keyInfo.data.is_free_tier ?? null }
      : null,
    note: `${free.length} zero-cost models available.`,
  };
}

export async function openrouterFreeModels() {
  const models = await call('OpenRouter', `${OPENROUTER_BASE}/models`, { timeout: 20000 });
  return (models?.data || [])
    .filter((m) => Number(m?.pricing?.prompt ?? 1) === 0 && Number(m?.pricing?.completion ?? 1) === 0)
    .map((m) => m.id)
    .slice(0, 60);
}

async function openrouterJson(apiKey, model, system, user) {
  const data = await call('OpenRouter', `${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'http-referer': 'https://openclips.local',
      'x-title': 'TJ OpenClips AI Studio',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    timeout: 240000,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new ProviderError('OpenRouter', 200, 'The model returned an empty response.', 'Try a different model.');
  return { parsed: parseJsonLoose(content), model: data?.model || model, usage: data?.usage || null };
}

/* ---------------------------------------------------------------- Gemini */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function geminiTest(apiKey) {
  const started = Date.now();
  const data = await call('Gemini', `${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}`, {
    timeout: 20000,
  });
  const names = (data?.models || [])
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .filter((n) => n.startsWith('gemini'));
  return { ok: true, latencyMs: Date.now() - started, models: names.slice(0, 40), note: `${names.length} Gemini models visible.` };
}

async function geminiJson(apiKey, model, prompt) {
  const data = await call('Gemini', `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
    timeout: 240000,
  });
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) {
    const blocked = data?.promptFeedback?.blockReason;
    throw new ProviderError('Gemini', 200, blocked ? `Request blocked: ${blocked}` : 'Gemini returned an empty response.', 'Try a different model or shorter transcript.');
  }
  return { parsed: parseJsonLoose(text), model, usage: data?.usageMetadata || null };
}

/* --------------------------------------------------------------- shared */

export function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  const stripped = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new ProviderError('AI', 200, 'The model did not return valid JSON.', 'Retry, or pick a model with better JSON support.');
  }
}

const ANALYSIS_SYSTEM = `You are a short-form video editor who has cut thousands of viral clips.
You receive a timestamped transcript and must select the strongest standalone moments.
Return STRICT JSON only, no prose, with this shape:
{"summary":"one sentence","topics":["..."],"moments":[{"start":12.5,"end":45.0,"title":"max 70 chars","hook":"the opening line","caption":"1-2 sentence social caption","hashtags":["#tag"],"score":0-100,"reason":"why it works","speaker":"name or Unknown"}]}
Rules: moments must be 15-60 seconds, start and end must be inside the transcript, never overlap, prefer complete thoughts with a hook and a payoff. Score honestly: 90+ only for genuinely strong hooks.`;

export function buildTranscriptPrompt(transcript, { targetClips, minSec, maxSec, style }) {
  const lines = transcript.segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join('\n')
    .slice(0, 60000);
  return `Transcript (start-end seconds in brackets):\n${lines}\n\nSelect the ${targetClips} best clips. Each clip must be between ${minSec} and ${maxSec} seconds. Caption style target: ${style || 'punchy'}. Return JSON only.`;
}

export async function analyseTranscript({ provider, apiKey, model, transcript, options = {} }) {
  const prompt = buildTranscriptPrompt(transcript, options);
  let result;
  if (provider === 'openrouter') {
    result = await openrouterJson(apiKey, model, ANALYSIS_SYSTEM, prompt);
  } else if (provider === 'gemini') {
    result = await geminiJson(apiKey, model, `${ANALYSIS_SYSTEM}\n\n${prompt}`);
  } else if (provider === 'groq') {
    const data = await call('Groq', `${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
      timeout: 240000,
    });
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new ProviderError('Groq', 200, 'The model returned an empty response.');
    result = { parsed: parseJsonLoose(content), model: data?.model || model, usage: data?.usage || null };
  } else {
    throw new ProviderError('AI', 400, `Unknown analysis provider: ${provider}`);
  }

  const moments = Array.isArray(result.parsed?.moments) ? result.parsed.moments : [];
  if (!moments.length) {
    throw new ProviderError(provider, 200, 'The model did not return any clip moments.', 'Retry with a different model or a longer transcript.');
  }
  return {
    moments: moments
      .map((m) => ({
        start: Math.max(0, Number(m.start) || 0),
        end: Math.max(0, Number(m.end) || 0),
        title: String(m.title || 'Untitled moment').slice(0, 120),
        hook: String(m.hook || '').slice(0, 200),
        caption: String(m.caption || '').slice(0, 600),
        hashtags: Array.isArray(m.hashtags) ? m.hashtags.map((h) => String(h)).slice(0, 8) : [],
        score: Math.min(100, Math.max(0, Number(m.score) || 0)),
        reason: String(m.reason || '').slice(0, 300),
        speaker: String(m.speaker || 'Unknown').slice(0, 60),
      }))
      .filter((m) => m.end > m.start + 3),
    summary: String(result.parsed?.summary || ''),
    topics: Array.isArray(result.parsed?.topics) ? result.parsed.topics.slice(0, 10) : [],
    model: result.model,
    usage: result.usage,
  };
}

export async function generateCaption({ provider, apiKey, model, transcript, platform }) {
  const prompt = `Write one social caption for ${platform || 'TikTok'} from this transcript excerpt. Return JSON: {"caption":"...","hashtags":["#a","#b"]}. Keep the caption under 220 characters, no emoji spam, 3-6 relevant hashtags.\n\nTranscript:\n${String(transcript).slice(0, 6000)}`;
  if (provider === 'gemini') {
    const result = await geminiJson(apiKey, model, prompt);
    return { caption: String(result.parsed?.caption || ''), hashtags: (result.parsed?.hashtags || []).map(String), model: result.model };
  }
  const system = 'You write short-form social copy. Return JSON only.';
  const result = await openrouterJson(apiKey, model, system, prompt);
  return { caption: String(result.parsed?.caption || ''), hashtags: (result.parsed?.hashtags || []).map(String), model: result.model };
}
