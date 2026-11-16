// Answers come from proxy/hf-chat.ts, served by the "proxy" Vercel project, which holds
// the Hugging Face token (env HF_TOKEN), pins the provider (deepinfra) and rate-limits. No secret here.
const CHAT_URL = import.meta.env.VITE_CHAT_URL || 'https://proxy-xi-pied.vercel.app/api/hf-chat'

// → { content, finish_reason }. Throws with the server's own sentence on failure; aborts with `signal`.
export async function chat(body, signal) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `The server answered ${res.status}.`)
  return json
}

// Settings menu choices, cheapest first. Rules: 131k+ context on deepinfra, ~$0.02-0.05/M in,
// non-reasoning only (reasoning models like gpt-oss, Qwen3, Granite 4.2 spend max_tokens on hidden thinking).
// Prices/context checked 2026-11-15 via https://router.huggingface.co/v1/models
// The proxy refuses any other model: keep in sync with MODELS in proxy/hf-chat.ts
const ALLOWED = [
  'meta-llama/Llama-3.1-8B-Instruct', // in 0.02 / out 0.05
  'google/gemma-3-4b-it', //             in 0.05 / out 0.10
  'google/gemma-3-12b-it', //            in 0.05 / out 0.15
]

// VITE_HF_MODEL picks the default (moved first), ignored if not in ALLOWED
export const MODELS = [...new Set([import.meta.env.VITE_HF_MODEL, ...ALLOWED])].filter((m) =>
  ALLOWED.includes(m),
)

// one-line notes under each model in the settings popover
export const MODEL_NOTES = {
  'meta-llama/Llama-3.1-8B-Instruct': 'Quick, everyday answers',
  'google/gemma-3-4b-it': 'Lightest and fastest',
  'google/gemma-3-12b-it': 'More capable, a little slower',
}

// "meta-llama/Llama-3.1-8B-Instruct" → "Llama 3.1 8B", "google/gemma-3-12b-it" → "Gemma 3 12B"
export function modelName(id) {
  return id
    .split('/')
    .pop()
    .replace(/-(instruct|it)$/i, '')
    .split('-')
    .map((w) => (/^\d+(\.\d+)?b$/i.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}
