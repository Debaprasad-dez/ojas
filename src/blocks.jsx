import { lazy, Suspense, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// heavy libs load only when a chart/table first appears
const Chart = lazy(() => import('./Chart.jsx'))
const Grid = lazy(() => import('./Grid.jsx'))
const Flowchart = lazy(() => import('./Flowchart.jsx'))

const CHART_TYPES = ['line', 'bar', 'column', 'pie', 'area']

// mermaid shape brackets per node kind
const SHAPES = {
  process: ['["', '"]'],
  decision: ['{"', '"}'],
  start: ['(["', '"])'],
  end: ['(["', '"])'],
}
// labels sit inside "...": escape mermaid's entity char (#) first, then the quote
const esc = (s) => String(s).replace(/#/g, '#35;').replace(/"/g, '#quot;').replace(/\s+/g, ' ')

const callout = (level) => ({
  prompt: 'short markdown note',
  parse: (raw) => raw.trim() && { level, text: raw.trim() },
  Component: Callout,
})

// Block registry. A fenced ```<tag> block in a reply is run through parse(raw):
// props → render Component; null or throw → show as a plain code block.
// `prompt` goes into the system prompt and is re-sent every request, keep it short.
const BLOCKS = {
  chart: {
    prompt: '{"type":"line|bar|column|pie|area","title":"","categories":[""],"series":[{"name":"","data":[0]}]}',
    parse(raw) {
      const d = JSON.parse(raw)
      const ok =
        CHART_TYPES.includes(d.type) &&
        Array.isArray(d.series) &&
        d.series.every((s) => Array.isArray(s.data) && s.data.every(Number.isFinite))
      if (!ok) return null
      const categories = Array.isArray(d.categories) ? d.categories.map(String) : undefined
      return {
        // the title shows in the figure card's header, so the chart itself draws none
        title: String(d.title ?? ''),
        options: {
          chart: { type: d.type, styledMode: true },
          title: { text: '' },
          xAxis: { categories },
          yAxis: { title: { text: null } },
          series: d.series.map((s) => ({
            name: String(s.name ?? ''),
            data: d.type === 'pie' ? s.data.map((y, i) => ({ name: categories?.[i], y })) : s.data,
          })),
        },
      }
    },
    Component: Chart,
  },
  table: {
    prompt: '{"columns":[""],"rows":[[""]]}',
    parse(raw) {
      const d = JSON.parse(raw)
      const ok = Array.isArray(d.columns) && Array.isArray(d.rows) && d.rows.every(Array.isArray)
      return ok ? { columns: d.columns.map(String), rows: d.rows } : null
    },
    Component: Grid,
  },
  flowchart: {
    prompt:
      '(prefer TD) {"direction":"TD|LR","nodes":[{"id":"","label":"","shape":"process|decision|start|end"}],"edges":[{"from":"","to":"","label":""}]}',
    // JSON → mermaid source; the model never writes mermaid syntax, so output is always valid
    parse(raw) {
      const d = JSON.parse(raw)
      if (!Array.isArray(d.nodes) || !d.nodes.length || !Array.isArray(d.edges)) return null
      // model ids can be anything (an id of "end" even breaks mermaid), so map them to n0, n1…
      const ids = new Map(d.nodes.map((n, i) => [String(n.id), `n${i}`]))
      if (ids.size !== d.nodes.length) return null // duplicate ids
      if (!d.edges.every((e) => ids.has(String(e.from)) && ids.has(String(e.to)))) return null
      const lines = [`flowchart ${d.direction === 'LR' ? 'LR' : 'TD'}`]
      d.nodes.forEach((n, i) => {
        const [open, close] = SHAPES[n.shape] ?? SHAPES.process
        lines.push(`  n${i}${open}${esc(n.label || n.id)}${close}`)
      })
      for (const e of d.edges) {
        const label = e.label ? `|"${esc(e.label)}"|` : ''
        lines.push(`  ${ids.get(String(e.from))} -->${label} ${ids.get(String(e.to))}`)
      }
      return { code: lines.join('\n') }
    },
    Component: Flowchart,
  },
  info: callout('info'),
  warning: callout('warning'),
  error: callout('error'),
}

// format rules for the system prompt; App prepends the elaboration instruction
export const FORMAT_PROMPT =
  'Reply in Markdown. For rich output use a fenced code block whose language tag is one of the following, with the body shown (JSON must be valid):\n' +
  Object.entries(BLOCKS)
    .map(([tag, b]) => `${tag}: ${b.prompt}`)
    .join('\n')

function Callout({ level, text }) {
  return (
    <div className={`callout callout-${level}`} role="note">
      <Rich text={text} />
    </div>
  )
}

const CopyIcon = ({ done }) => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
    {done ? (
      <path d="m5 12.6 4.4 4.4L19 7.4" />
    ) : (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2.5" />
        <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
      </>
    )}
  </svg>
)

function CodeBlock({ code, lang, children }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <div className="code">
      <div className="code-head">
        <span>{lang || 'code'}</span>
        <button
          type="button"
          className={'iconbtn' + (copied ? ' done' : '')}
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title={copied ? 'Copied' : 'Copy code'}
        >
          <CopyIcon done={copied} />
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

function Pre({ node, children }) {
  const code = node.children[0]
  const tag = code?.properties?.className?.[0]?.replace('language-', '')
  const raw = (code?.children ?? []).map((c) => c.value ?? '').join('')
  const block = Object.hasOwn(BLOCKS, tag ?? '') ? BLOCKS[tag] : null
  let props = null
  try {
    props = block?.parse(raw)
  } catch {
    // invalid JSON → falls through to plain code
  }
  if (props) {
    // callouts are notes in the text flow; charts, tables and flowcharts are figure cards
    if (block.Component === Callout) return <Callout {...props} />
    return (
      <figure className="fig">
        {props.title && <div className="fig-head">{props.title}</div>}
        <div className="fig-body">
          <Suspense fallback={<div className="fig-loading" aria-label="Loading" />}>
            <block.Component {...props} />
          </Suspense>
        </div>
      </figure>
    )
  }
  return (
    <CodeBlock code={raw.replace(/\n$/, '')} lang={tag}>
      {children}
    </CodeBlock>
  )
}

// markdown tables get the same card as the rich figures
function Table({ children }) {
  return (
    <figure className="fig">
      <div className="tbl-wrap">
        <table className="tbl">{children}</table>
      </div>
    </figure>
  )
}

// links open in a new tab so the chat isn't lost
function Link({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

const plugins = [remarkGfm]
const components = { pre: Pre, a: Link, table: Table }

// Raw HTML in model output is ignored (react-markdown default), keep it that way.
export function Rich({ text }) {
  return (
    <Markdown remarkPlugins={plugins} components={components}>
      {text}
    </Markdown>
  )
}
