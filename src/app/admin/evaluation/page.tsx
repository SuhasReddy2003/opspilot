'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import NavBar from '@/components/NavBar'

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
  const [user, setUser] = useState<User | null>(null)
  const [results, setResults] = useState<EvalResult[]>([])
  const [summary, setSummary] = useState<EvalSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUser(authData.user)
    }
    load()
  }, [router])

  async function runEvaluation() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/run-evaluation')
      const data = await response.json()
      setResults(data.results)
      setSummary(data.summary)
    } catch {
      setError('Failed to run evaluation')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="admin" email={user.email || ''} />

      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-2xl font-semibold mb-1">RAG Evaluation</h1>
        <p className="text-text-muted mb-6">
          Runs a curated set of 10 test questions against the retrieval system and checks whether the
          correct knowledge base article was retrieved as the top result.
        </p>

        <button
          onClick={runEvaluation}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover transition font-medium disabled:opacity-50 mb-8"
        >
          {loading ? 'Running evaluation...' : 'Run Evaluation'}
        </button>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-6">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className={`rounded-xl p-5 ${summary.accuracy >= 70 ? 'glow-ai bg-surface' : 'glass-card'}`}>
              <div className={`text-3xl font-semibold font-mono ${summary.accuracy >= 70 ? 'text-ai' : 'text-warning'}`}>
                {summary.accuracy}%
              </div>
              <div className="text-sm text-text-muted mt-1">Retrieval Accuracy</div>
            </div>
            <div className="glass-card rounded-xl p-5">
              <div className="text-3xl font-semibold font-mono">{summary.avgSimilarity}%</div>
              <div className="text-sm text-text-muted mt-1">Avg. Top Similarity</div>
            </div>
            <div className="glass-card rounded-xl p-5">
              <div className="text-3xl font-semibold font-mono">
                {summary.correctCount}/{summary.totalQuestions}
              </div>
              <div className="text-sm text-text-muted mt-1">Correct Retrievals</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 border ${
                r.correct ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
              }`}
            >
              <p className="font-medium text-sm mb-1">
                {r.correct ? '✅' : '❌'} {r.question}
              </p>
              <p className="text-xs text-text-muted">
                Expected: <span className="text-text font-medium">{r.expected_topic}</span> — Got:{' '}
                <span className="text-text font-medium">{r.top_result || 'none'}</span>{' '}
                <span className="font-mono">({(r.top_similarity * 100).toFixed(0)}%)</span>
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}