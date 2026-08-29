'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type EvalResult = {
  question: string
  expected_topic: string
  top_result: string | null
  top_similarity: number
  correct: boolean
  error?: string
}

type EvalSummary = {
  totalQuestions: number
  correctCount: number
  accuracy: number
  avgSimilarity: number
}

export default function EvaluationPage() {
  const router = useRouter()
  const [results, setResults] = useState<EvalResult[]>([])
  const [summary, setSummary] = useState<EvalSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runEvaluation() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/run-evaluation')
      const data = await response.json()
      setResults(data.results)
      setSummary(data.summary)
    } catch (err) {
      setError('Failed to run evaluation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Admin
      </Link>

      <h1>RAG Evaluation</h1>
      <p style={{ color: '#888' }}>
        Runs a curated set of {10} test questions against the retrieval system and checks whether
        the correct knowledge base article was retrieved as the top result.
      </p>

      <button onClick={runEvaluation} disabled={loading} style={{ padding: '10px 20px', marginBottom: '24px' }}>
        {loading ? 'Running evaluation...' : 'Run Evaluation'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {summary && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '16px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold', color: summary.accuracy >= 70 ? 'lightgreen' : 'orange' }}>
              {summary.accuracy}%
            </div>
            <div>Retrieval Accuracy</div>
          </div>
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '16px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{summary.avgSimilarity}%</div>
            <div>Avg. Top Similarity</div>
          </div>
          <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '16px', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
              {summary.correctCount}/{summary.totalQuestions}
            </div>
            <div>Correct Retrievals</div>
          </div>
        </div>
      )}

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${r.correct ? '#2a5a2a' : '#5a2a2a'}`,
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '10px',
          }}
        >
          <strong>{r.correct ? '✅' : '❌'} {r.question}</strong>
          <p style={{ margin: '6px 0', color: '#aaa' }}>
            Expected: <strong>{r.expected_topic}</strong> — Got:{' '}
            <strong>{r.top_result || 'none'}</strong> ({(r.top_similarity * 100).toFixed(0)}% similarity)
          </p>
        </div>
      ))}
    </div>
  )
}