import { useEffect, useRef, useState } from 'react'
import Emblem from './Emblem.jsx'

const TOPICS = [
  'Molecular biology',
  'Indian history',
  'Greek philosophy',
  'Geopolitics',
  'Skincare',
  'Stock market',
]

// Welcome: "Let's learn about <topic>" with the topic typed, held, erased, then the next one
// (the design's timings). Clicking the topic asks about it. Holds still while not visible.
export default function Hero({ active, onPick }) {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let alive = true
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const idle = () => !activeRef.current || document.hidden
    ;(async () => {
      if (reduced) {
        setTyped(TOPICS[0])
        return
      }
      await sleep(700)
      for (let k = 0; alive; k = (k + 1) % TOPICS.length) {
        const word = TOPICS[k]
        setI(k)
        for (let n = 1; n <= word.length && alive; n++) {
          setTyped(word.slice(0, n))
          await sleep(58 + Math.random() * 46)
        }
        await sleep(2600)
        while (alive && idle()) await sleep(400)
        for (let n = word.length - 1; n >= 0 && alive; n--) {
          setTyped(word.slice(0, n))
          await sleep(26)
        }
        await sleep(320)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <section className="hero colw">
      <Emblem />
      <h1 className="hero-h">
        <span className="hero-lead">Let's learn about</span>
        <button
          className="hero-topic"
          type="button"
          aria-label={`${TOPICS[i]}. Ask about this topic`}
          onClick={() => onPick(TOPICS[i])}
        >
          <span className="typed">{typed}</span>
          <span className="caret" aria-hidden="true" />
        </button>
      </h1>
      <p className="hero-sub">Answers can include charts, tables and flowcharts.</p>
    </section>
  )
}
