/**
 * Ojas One's chat — Hugging Face proxy, Vercel Function (Node.js runtime).
 * Holds HF_TOKEN server-side so it never ships in the app's browser bundle.
 *
 * Source of truth: the Ojas repo, proxy/hf-chat.ts. It is served from the
 * "proxy" Vercel project (https://proxy-xi-pied.vercel.app/api/hf-chat), which
 * also hosts LifeVerse's api/chat.ts. The two share nothing but the project:
 * this file reads no LifeVerse config and LifeVerse reads none of its.
 *
 * POST /api/hf-chat  { model, messages: [{ role, content }], max_tokens }
 *   → 200 { content, finish_reason }  |  4xx/5xx { error: "<sentence for the user>" }
 *
 * Public on purpose (Ojas One has no sign-in), so what it will spend is bounded
 * here, not trusted from the client: three cheap models, at most 2048 tokens per
 * answer, a capped history, a per-IP rate limit, and browser calls only from
 * Ojas One's own origins.
 *
 * Env: HF_TOKEN (required) — Hugging Face token, server-only.
 *
 * Node.js runtime, not Edge: a long answer can take more than the 25 s an Edge
 * function gets to start responding, so it gets up to 60 s.
 */
export const config = { maxDuration: 60 };

const HF_URL = "https://router.huggingface.co/v1/chat/completions";

// Pinned provider: deepinfra serves all three with a 131k context window, and
// "auto" routing could pick a smaller-context or pricier one.
const PROVIDER = "deepinfra";

// Ojas One's model menu. Anything else is refused, so the token can't be
// pointed at an expensive model. Keep in sync with ALLOWED in chatter-ai src/hf.js.
const MODELS = ["meta-llama/Llama-3.1-8B-Instruct", "google/gemma-3-4b-it", "google/gemma-3-12b-it"];
const ROLES = ["system", "user", "assistant"];
const MAX_MESSAGES = 16; // system prompt + the app's 15-message history
const MAX_CHARS = 20_000; // per message
const MAX_TOKENS = 2048; // the app's "Detailed"

// ponytail: counts live in this instance's memory, so each instance limits on its
// own; a shared store (e.g. Upstash) if abuse shows up. A spend cap on the HF
// account is the real ceiling.
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function limited(ip: string): number {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) {
    hits.set(ip, recent);
    return Math.ceil((recent[0] + WINDOW_MS - now) / 60_000); // minutes until a slot frees up
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // never grow without bound
  return 0;
}

// Browsers may call this only from Ojas One: the GitHub Pages site and the dev
// server. An origin carries no path, so other pages on debaprasad-dez.github.io
// share the first one; CORS is a browser fence, not auth — the limits above are.
function allowed(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "https://debaprasad-dez.github.io") return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (allowed(origin)) {
    h["Access-Control-Allow-Origin"] = origin!;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

function reply(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

function valid(p: any): p is { model: string; messages: { role: string; content: string }[]; max_tokens: number } {
  return (
    !!p &&
    MODELS.includes(p.model) &&
    Number.isInteger(p.max_tokens) &&
    p.max_tokens >= 1 &&
    p.max_tokens <= MAX_TOKENS &&
    Array.isArray(p.messages) &&
    p.messages.length >= 1 &&
    p.messages.length <= MAX_MESSAGES &&
    p.messages.every(
      (m: any) => m && ROLES.includes(m.role) && typeof m.content === "string" && m.content.length <= MAX_CHARS
    )
  );
}

export function OPTIONS(req: Request): Response {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");

  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error("[hf-chat] HF_TOKEN is not set");
    return reply({ error: "Answers are switched off right now. Please try again later." }, 503, origin);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const wait = limited(ip);
  if (wait) {
    return reply(
      { error: `Too many questions in a short time. Please wait ${wait} minute${wait === 1 ? "" : "s"} and try again.` },
      429,
      origin
    );
  }

  let p: unknown;
  try {
    p = await req.json();
  } catch {
    p = null;
  }
  if (!valid(p)) {
    return reply({ error: "That question could not be sent. Please try again." }, 400, origin);
  }

  try {
    // req.signal: Stop in the app (or a closed tab) abandons the answer here too
    const hf = await fetch(HF_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: `${p.model}:${PROVIDER}`, messages: p.messages, max_tokens: p.max_tokens }),
      signal: req.signal,
    });
    if (!hf.ok) {
      console.error("[hf-chat] Hugging Face", hf.status, (await hf.text()).slice(0, 500));
      return reply({ error: "The model didn’t answer. Please try again." }, 502, origin);
    }
    const out: any = await hf.json();
    const choice = out?.choices?.[0];
    return reply(
      { content: choice?.message?.content ?? "", finish_reason: choice?.finish_reason ?? null },
      200,
      origin
    );
  } catch (err: any) {
    if (req.signal?.aborted) return new Response(null, { status: 499 }); // nobody is listening
    console.error("[hf-chat]", err?.message ?? err);
    return reply({ error: "The model didn’t answer. Please try again." }, 502, origin);
  }
}
