import { useMemo } from 'react'

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'hr' }

function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''

    // fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i += 1
      }
      // consume closing fence
      if (i < lines.length) i += 1
      blocks.push({ type: 'code', text: codeLines.join('\n') })
      continue
    }

    if (line.trim() === '---') {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    const h1 = line.match(/^#\s+(.*)$/)
    const h2 = line.match(/^##\s+(.*)$/)
    const h3 = line.match(/^###\s+(.*)$/)
    if (h1) {
      blocks.push({ type: 'h1', text: h1[1] })
      i += 1
      continue
    }
    if (h2) {
      blocks.push({ type: 'h2', text: h2[1] })
      i += 1
      continue
    }
    if (h3) {
      blocks.push({ type: 'h3', text: h3[1] })
      i += 1
      continue
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // paragraph
    if (line.trim() === '') {
      i += 1
      continue
    }
    const para: string[] = [line]
    i += 1
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      // stop if next block begins
      const peek = lines[i] ?? ''
      if (peek.trim().startsWith('```') || /^#{1,3}\s+/.test(peek) || /^\s*[-*]\s+/.test(peek) || peek.trim() === '---') {
        break
      }
      para.push(peek)
      i += 1
    }
    blocks.push({ type: 'p', text: para.join('\n') })
  }

  return blocks
}

export default function Markdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content])

  return (
    <div className="prose prose-invert max-w-none">
      {blocks.map((b, idx) => {
        if (b.type === 'h1') return <h1 key={idx} className="text-2xl font-semibold text-white">{b.text}</h1>
        if (b.type === 'h2') return <h2 key={idx} className="mt-6 text-xl font-semibold text-white">{b.text}</h2>
        if (b.type === 'h3') return <h3 key={idx} className="mt-4 text-base font-semibold text-white">{b.text}</h3>
        if (b.type === 'hr') return <hr key={idx} className="my-6 border-white/10" />
        if (b.type === 'ul')
          return (
            <ul key={idx} className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/80">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )
        if (b.type === 'code')
          return (
            <pre
              key={idx}
              className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-white/85"
            >
              <code>{b.text}</code>
            </pre>
          )
        return (
          <p key={idx} className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

