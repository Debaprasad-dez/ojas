// Unit check of proxy/hf-chat.ts with Hugging Face stubbed (no credits).
// npm run test:proxy  (Node 22.6+: runs the .ts directly)
import assert from 'node:assert'
const { OPTIONS, POST } = await import('./hf-chat.ts')

const upstream = []
let answer = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }] }))
globalThis.fetch = async (url, init) => { upstream.push({ url, init }); return answer(init) }

const ok = { model: 'meta-llama/Llama-3.1-8B-Instruct', messages: [{ role: 'system', content: 'Be brief.' }, { role: 'user', content: 'Hello' }], max_tokens: 512 }
const req = (body, { ip = '1.1.1.1', origin = 'http://localhost:5173', signal } = {}) =>
  new Request('https://x/api/hf-chat', { method: 'POST', headers: { origin, 'x-forwarded-for': ip, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), signal })

// CORS: localhost and *.vercel.app yes, anything else gets no allow header
assert.equal(OPTIONS(req(ok)).headers.get('access-control-allow-origin'), 'http://localhost:5173')
assert.equal(OPTIONS(req(ok, { origin: 'https://debaprasad-dez.github.io' })).headers.get('access-control-allow-origin'), 'https://debaprasad-dez.github.io'); assert.equal(OPTIONS(req(ok, { origin: 'https://someone.vercel.app' })).headers.get('access-control-allow-origin'), null)
assert.equal(OPTIONS(req(ok, { origin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null)

// No token: switched off, nothing sent
delete process.env.HF_TOKEN
assert.equal((await POST(req(ok))).status, 503)
process.env.HF_TOKEN = 'hf_selfcheck'

// Refused without spending anything
for (const body of [
  { ...ok, model: 'meta-llama/Llama-3.1-405B-Instruct' },
  { ...ok, max_tokens: 4096 }, { ...ok, max_tokens: 0 }, { ...ok, max_tokens: 1.5 },
  { ...ok, messages: [] }, { ...ok, messages: Array(17).fill({ role: 'user', content: 'x' }) },
  { ...ok, messages: [{ role: 'tool', content: 'x' }] }, { ...ok, messages: [{ role: 'user', content: 'x'.repeat(20001) }] },
  { messages: ok.messages }, 'not json',
]) {
  const res = await POST(req(body, { ip: '2.2.2.2' }))
  assert.equal(res.status, 400, `must refuse ${JSON.stringify(body).slice(0, 60)}`)
  assert.ok((await res.json()).error)
}
assert.equal(upstream.length, 0, 'refused requests must never reach Hugging Face')

// Good request: pinned provider, server-side token, answer passed through
const good = await POST(req(ok))
assert.equal(good.status, 200)
assert.deepEqual(await good.json(), { content: 'Hi', finish_reason: 'stop' })
const sent = JSON.parse(upstream[0].init.body)
assert.equal(sent.model, 'meta-llama/Llama-3.1-8B-Instruct:deepinfra')
assert.equal(sent.max_tokens, 512)
assert.equal(upstream[0].init.headers.Authorization, 'Bearer hf_selfcheck')

// Upstream failure: a plain sentence, never its body or the token
answer = async () => new Response('{"error":"bad token hf_selfcheck"}', { status: 401 })
const failed = await POST(req(ok))
assert.equal(failed.status, 502)
assert.ok(!(await failed.text()).includes('hf_selfcheck'))

// Stop: aborting the incoming request aborts the Hugging Face call
answer = (init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))))
const stop = new AbortController()
const pending = POST(req(ok, { signal: stop.signal }))
await new Promise((r) => setTimeout(r, 50))
stop.abort()
await pending
assert.equal(upstream.at(-1).init.signal.aborted, true, 'Stop must abort the upstream call')

// Rate limit: 30 per IP per window, then 429 without reaching Hugging Face
answer = async () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }))
for (let i = 0; i < 30; i++) assert.equal((await POST(req(ok, { ip: '9.9.9.9' }))).status, 200)
const before = upstream.length
const limited = await POST(req(ok, { ip: '9.9.9.9' }))
assert.equal(limited.status, 429)
assert.match((await limited.json()).error, /wait \d+ minutes?/)
assert.equal(upstream.length, before)
assert.equal((await POST(req(ok, { ip: '8.8.8.8' }))).status, 200, 'other IPs unaffected')

console.log('hf-chat check: all passed')
