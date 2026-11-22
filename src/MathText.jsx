import katex from 'katex'
import 'katex/dist/katex.min.css'

const mathPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g

function renderMath(source, displayMode) {
  return katex.renderToString(source, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
  })
}

function splitMath(value) {
  const parts = []
  let lastIndex = 0

  for (const match of value.matchAll(mathPattern)) {
    const [token] = match
    const index = match.index ?? 0
    if (index > lastIndex) parts.push({ type: 'text', value: value.slice(lastIndex, index) })

    const displayMode = token.startsWith('$$') || token.startsWith('\\[')
    const delimiterSize = token.startsWith('$$') || token.startsWith('\\[') || token.startsWith('\\(') ? 2 : 1
    parts.push({
      type: 'math',
      displayMode,
      value: token.slice(delimiterSize, -delimiterSize),
    })
    lastIndex = index + token.length
  }

  if (lastIndex < value.length) parts.push({ type: 'text', value: value.slice(lastIndex) })
  return parts
}

export function MathText({ children, className = '' }) {
  const value = String(children ?? '')
  const parts = splitMath(value)

  return (
    <div className={`math-text whitespace-pre-wrap ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.value}</span>
        const html = renderMath(part.value, part.displayMode)
        return part.displayMode
          ? <div key={index} className="my-2 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />
          : <span key={index} className="mx-0.5" dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </div>
  )
}

export function MathEditor({ label, value, onChange, placeholder, rows = 4, required = false }) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>}
      <div className="grid gap-2 md:grid-cols-2">
        <textarea
          className={inputClass}
          rows={rows}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="min-h-24 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 text-xs font-semibold text-slate-500">Jonli ko‘rinish</p>
          {value ? <MathText>{value}</MathText> : <span className="text-slate-400">Natija shu yerda ko‘rinadi</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">LaTeX: inline <code>$x^2$</code>, block <code>$$…$$</code>, <code>\(…\)</code> yoki <code>\[…\]</code>.</p>
    </div>
  )
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400'
