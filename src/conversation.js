// Pure conversation rules shared by the app, the context panel and the tests.

// odd number keeps the window starting on a user message
export const HISTORY_LIMIT = 15
// prior messages sent with each request; the new message fills the last slot
export const MAX_CONTEXT = HISTORY_LIMIT - 1

// Messages that count as conversation: replies, plus your messages that got a reply.
// Drops error and "stopped" entries, a message whose request failed or was stopped, one still
// waiting, and one stranded by a reload mid-request. Any of those would put two user turns in a
// row, which Gemma's chat template rejects. Returns [message, index-in-chat] pairs.
export const sentWithIndex = (messages) =>
  messages
    .map((m, i) => [m, i])
    .filter(
      ([m, i]) =>
        m.role === 'assistant' || (m.role === 'user' && messages[i + 1]?.role === 'assistant'),
    )

export const sentOf = (messages) => sentWithIndex(messages).map(([m]) => m)

// the slice of the conversation the model sees with the next message
export const contextOf = (messages) => sentOf(messages).slice(-MAX_CONTEXT)

// The context panel's view of the same rule: visible [message, index] pairs, how many, how many
// older ones no longer go, and how many of the oldest fall out after the next exchange (your
// message + the reply add two).
export function contextState(messages) {
  const sent = sentWithIndex(messages)
  const vis = sent.slice(-MAX_CONTEXT)
  const n = vis.length
  return { vis, n, older: sent.length - n, leaving: Math.max(0, n + 2 - MAX_CONTEXT) }
}

// A reply that hit max_tokens: end it at the last complete sentence/line so it reads as finished.
// Also drops a half-written ``` block (broken JSON would show as raw code) and anything left
// dangling at the end: headings, "intro:" lines, rules, a table header with no rows.
export function trimToComplete(text) {
  let out = text
  const fences = [...out.matchAll(/^(?:```|~~~)/gm)]
  if (fences.length % 2) {
    out = out.slice(0, fences.at(-1).index) // unclosed block: cut from where it opened
  } else {
    // the last line was cut mid-way (unless it closes a block): keep up to its last sentence end
    const start = out.lastIndexOf('\n') + 1
    const last = out.slice(start)
    if (!/^(?:```|~~~)\s*$/.test(last.trim())) {
      const end = [...last.matchAll(/[.!?][*_"”’')\]]*(?=\s|$)/g)].at(-1)
      out = out.slice(0, start) + (end ? last.slice(0, end.index + end[0].length) : '')
    }
  }
  const lines = out.split('\n')
  for (;;) {
    const l = (lines.at(-1) ?? 'x').trim()
    if (/^\|?[\s:|-]*-[\s:|-]*\|?$/.test(l) && l.includes('|')) lines.splice(-2) // header + separator
    else if (l === '' || /^#{1,6}\s/.test(l) || /:[*_]*$/.test(l) || /^([-*_]\s*){3,}$/.test(l) || /^([-*+]|\d+\.)$/.test(l)) lines.pop()
    else break
  }
  // nothing complete survived (one long unfinished sentence): cut at a word and mark it
  return lines.join('\n').trimEnd() || text.replace(/\s+\S*$/, '…')
}

// "Teach me about greek philosophy?" → "Greek philosophy": a short sidebar title
export function titleFrom(q) {
  let t = q
    .trim()
    .replace(/^(teach me about|let'?s learn about|tell me about|what is|what are|explain|compare)\s+/i, '')
    .replace(/[?.!]+$/, '')
  t = t.charAt(0).toUpperCase() + t.slice(1)
  return t.length > 44 ? t.slice(0, 42).trimEnd() + '…' : t
}
