'use client'

import { useState, useRef } from 'react'

type Source = {
  title: string
  category: string
  similarity: number
}

const SUGGESTED_QUESTIONS = [
  'I was charged twice, can I get a refund?',
  "I'm getting 429 errors from the API",
  'How do I add team members?',
]

export default function LiveDemoWidget() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasStreamedRef = useRef(false)

  async function askQuestion(q: string) {
    setLoading(true)
    setError('')
    setAnswer('')
    setSources([])
    hasStreamedRef.current = false

    try {
      const response = await fetch('/api/public-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('Streaming not supported')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        if (!hasStreamedRef.current && buffer.includes('\n')) {
          const [sourcesLine, ...rest] = buffer.split('\n')
          if (sourcesLine.startsWith('__SOURCES__')) {
            try {
              const parsedSources = JSON.parse(sourcesLine.replace('__SOURCES__', ''))
              setSources(parsedSources)
            } catch {
              // ignore parse errors, non-fatal
            }
            hasStreamedRef.current = true
            buffer = rest.join('\n')
            setAnswer(buffer)
            continue
          }
        }

        if (hasStreamedRef.current) {
          for (const char of chunk) {
            setAnswer((prev) => prev + char)
            await new Promise((r) => setTimeout(r, 8))
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (question.trim()) askQuestion(question.trim())
  }

  return (
    <div className="animate-pulse-glow rounded-2xl p-6 bg-surface">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-md bg-ai/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-ai" />
        </div>
        <p className="text-xs font-medium text-ai uppercase tracking-wide">
          Try it live — ask a real support question
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. I was charged twice, can I get a refund?"
          maxLength={300}
          className="flex-1 px-3.5 py-2.5 rounded-lg bg-bg border border-border text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover transition font-medium text-sm disabled:opacity-50 shrink-0"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuestion(q)
              askQuestion(q)
            }}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-text-muted hover:text-text hover:bg-surface-hover transition disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {(answer || loading) && (
        <div className="border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-text min-h-[1.5em]">
            {answer}
            {loading && <span className="inline-block w-1.5 h-4 bg-ai ml-0.5 animate-pulse align-middle" />}
          </p>

          {sources.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Sources</p>
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text">
                    {s.title} <span className="text-text-muted">({s.category})</span>
                  </span>
                  <span className="font-mono text-ai">{(s.similarity * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}