// Live check of the chat proxy that spends no credits: only requests it must refuse.
//   npm run check:proxy            (or VITE_CHAT_URL=... npm run check:proxy)
import assert from 'node:assert'

const URL_ = process.env.VITE_CHAT_URL || 'https://proxy-xi-pied.vercel.app/api/hf-chat'
const post = (body) =>
  fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(body) })
const ok = { model: 'meta-llama/Llama-3.1-8B-Instruct', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 }

const pre = await fetch(URL_, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } })
assert.equal(pre.headers.get('access-control-allow-origin'), 'http://localhost:5173', 'dev origin must be allowed')
const other = await fetch(URL_, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })
assert.equal(other.headers.get('access-control-allow-origin'), null, 'unknown origins must not be allowed')

for (const body of [{ ...ok, model: 'meta-llama/Llama-3.1-405B-Instruct' }, { ...ok, max_tokens: 4096 }, { ...ok, messages: [] }]) {
  const res = await post(body)
  assert.equal(res.status, 400, `must refuse ${JSON.stringify(body)}`)
  assert.ok((await res.json()).error)
}
console.log(`proxy check: ok (${URL_})`)
