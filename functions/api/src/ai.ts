/**
 * Server-side AI completion (Phase 4). Secrets never leave the server:
 * prefers the branch AI Gateway (native Gemini dialect, so the app's existing
 * Gemini model names pass through unchanged), falls back to the direct Gemini
 * REST endpoint with the server-side key (covers branches without gateway
 * injection, e.g. local dev or free-plan deploys).
 */

export const ALLOWED_MODELS = new Set([
  'gemini-pro-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemma-3-27b-it',
]);

export const MAX_PROMPT_CHARS = 12_000;
const MAX_OUTPUT_TOKENS = 2048;

export interface AiEnv {
  NEON_AI_GATEWAY_TOKEN?: string;
  NEON_AI_GATEWAY_BASE_URL?: string;
  GEMINI_API_KEY?: string;
}

export interface AiResult {
  text: string;
  via: 'gateway' | 'direct';
}

/** Pure helper (unit-tested): validate + normalize the client request. */
export function parseCompleteRequest(body: unknown):
  | { ok: true; model: string; prompt: string }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Expected a JSON object with { model, prompt }.' };
  }
  const { model, prompt } = body as { model?: unknown; prompt?: unknown };
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { ok: false, status: 400, error: 'Field "prompt" must be a non-empty string.' };
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, status: 413, error: `Prompt exceeds ${MAX_PROMPT_CHARS} characters.` };
  }
  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    return { ok: false, status: 400, error: `Unknown model. Allowed: ${[...ALLOWED_MODELS].join(', ')}.` };
  }
  return { ok: true, model, prompt };
}

const generationConfig = {
  temperature: 0.1,
  topK: 1,
  topP: 1,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
};

function extractText(data: unknown): string | null {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    promptFeedback?: { blockReason?: string };
  };
  if (d?.promptFeedback?.blockReason) {
    throw new Error(`Model blocked request: ${d.promptFeedback.blockReason}`);
  }
  return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export async function completePrompt(
  model: string,
  prompt: string,
  env: AiEnv
): Promise<AiResult> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig,
  });

  // 1. Branch AI Gateway (native Gemini dialect — model names pass through).
  const gatewayToken = env.NEON_AI_GATEWAY_TOKEN;
  const gatewayBase = (env.NEON_AI_GATEWAY_BASE_URL ?? '').replace(/\/+$/, '');
  if (gatewayToken && gatewayBase) {
    const res = await fetch(`${gatewayBase}/gemini/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`AI Gateway error: ${res.status} — ${await res.text()}`);
    }
    const text = extractText(await res.json());
    if (!text) throw new Error('AI Gateway returned no text.');
    return { text, via: 'gateway' };
  }

  // 2. Direct Gemini with the server-side key (never exposed to the browser).
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'AI not configured on the server (no gateway credentials and no GEMINI_API_KEY).'
    );
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status} — ${await res.text()}`);
  }
  const text = extractText(await res.json());
  if (!text) throw new Error('Gemini returned no text.');
  return { text, via: 'direct' };
}
