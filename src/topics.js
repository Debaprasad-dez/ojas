import { useEffect, useState } from 'react'

// Today's topics: random English Wikipedia articles, kept for the day so a reload doesn't
// reshuffle them ("today"). refresh() fetches a new set.
const KEY = 'ojas.topics.v1'
const COUNT = 10
const API =
  'https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=30&format=json&origin=*'
// pages that make poor "learn about" prompts
const SKIP = /^(lists? of|index of|outline of|glossary of)\b|\(disambiguation\)/i

const today = () => new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD

function readToday() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY))
    const topics = Array.isArray(c?.topics) ? c.topics.filter((t) => typeof t === 'string') : []
    return c?.date === today() && topics.length ? topics : null
  } catch {
    return null
  }
}

async function fetchTopics(signal) {
  const res = await fetch(API, { signal })
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`)
  const data = await res.json()
  const titles = (data?.query?.random ?? [])
    .map((r) => r.title)
    .filter((t) => typeof t === 'string' && !SKIP.test(t))
  const topics = [...new Set(titles)].slice(0, COUNT)
  if (!topics.length) throw new Error('No topics returned')
  return topics
}

// { topics: string[] | null, status: 'loading' | 'ready' | 'error', refresh, generation }
// generation bumps on every new set, so the UI can replay its entrance animation.
export function useTopics() {
  const [topics, setTopics] = useState(readToday)
  const [status, setStatus] = useState(() => (readToday() ? 'ready' : 'loading'))
  const [request, setRequest] = useState(() => (readToday() ? 0 : 1)) // >0: fetch a new set

  useEffect(() => {
    if (!request) return
    const ctrl = new AbortController()
    fetchTopics(ctrl.signal).then(
      (next) => {
        setTopics(next)
        setStatus('ready')
        try {
          localStorage.setItem(KEY, JSON.stringify({ date: today(), topics: next }))
        } catch {
          // storage full or blocked: today's set just won't survive a reload
        }
      },
      (err) => err.name !== 'AbortError' && setStatus('error'),
    )
    return () => ctrl.abort()
  }, [request])

  function refresh() {
    setStatus('loading')
    setRequest((r) => r + 1)
  }

  return { topics, status, refresh, generation: request }
}
