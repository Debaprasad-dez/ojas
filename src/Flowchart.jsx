import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Dark "kiln" flowchart: nodes like the design's flow cards (faint warm fill, hairline border,
// bone text), amber connectors.
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict', // keep: mermaid then DOMPurify-sanitizes the SVG we inject below
  theme: 'base',
  darkMode: true,
  fontFamily: 'Figtree, ui-sans-serif, system-ui, sans-serif',
  themeVariables: {
    primaryColor: '#1f1915',
    primaryBorderColor: '#4a3c33',
    primaryTextColor: '#F6EEE6',
    lineColor: '#F89F09',
    secondaryColor: '#1a1411',
    tertiaryColor: '#16110e',
    edgeLabelBackground: '#16110e',
    fontSize: '14px',
  },
  // natural size + horizontal scroll; shrink-to-fit made big charts unreadable
  flowchart: { useMaxWidth: false },
})

export default function Flowchart({ code }) {
  const ref = useRef(null)
  const id = 'fc' + useId().replace(/\W/g, '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    mermaid.render(id, code).then(
      ({ svg }) => {
        if (live) ref.current.innerHTML = svg
      },
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [id, code])

  if (failed) return <pre>{code}</pre>
  return <div ref={ref} className="flowchart" />
}
