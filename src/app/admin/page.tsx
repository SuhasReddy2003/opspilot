'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import NavBar from '@/components/NavBar'

type Stats = {
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  totalSuggestions: number
  accepted: number
  edited: number
  rejected: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
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

      const { data: tickets, error: ticketError } = await supabase.from('tickets').select('status')
      if (ticketError) {
        setError(ticketError.message)
        return
      }

      const { data: feedback, error: feedbackError } = await supabase
        .from('agent_feedback')
        .select('outcome')
      if (feedbackError) {
        setError(feedbackError.message)
        return
      }

      const { count: suggestionCount } = await supabase
        .from('ai_suggestions')
        .select('*', { count: 'exact', head: true })

      const totalTickets = tickets?.length || 0
      const openTickets = tickets?.filter((t) => t.status !== 'resolved').length || 0
      const resolvedTickets = tickets?.filter((t) => t.status === 'resolved').length || 0

      const accepted = feedback?.filter((f) => f.outcome === 'accepted').length || 0
      const edited = feedback?.filter((f) => f.outcome === 'edited').length || 0
      const rejected = feedback?.filter((f) => f.outcome === 'rejected').length || 0

      setStats({
        totalTickets,
        openTickets,
        resolvedTickets,
        totalSuggestions: suggestionCount || 0,
        accepted,
        edited,
        rejected,
      })
    }
    load()
  }, [router])

  if (!user || !stats) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  const totalFeedback = stats.accepted + stats.edited + stats.rejected
  const acceptRate = totalFeedback > 0 ? ((stats.accepted / totalFeedback) * 100).toFixed(1) : '0'
  const editRate = totalFeedback > 0 ? ((stats.edited / totalFeedback) * 100).toFixed(1) : '0'
  const rejectRate = totalFeedback > 0 ? ((stats.rejected / totalFeedback) * 100).toFixed(1) : '0'

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="admin" email={user.email || ''} />

      <main className="max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-2xl font-semibold mb-1">Admin Analytics</h1>
        <p className="text-text-muted mb-8">Overview of ticket volume and AI performance.</p>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-6">
            {error}
          </div>
        )}

        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Ticket Overview</h2>
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono">{stats.totalTickets}</div>
            <div className="text-sm text-text-muted mt-1">Total Tickets</div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono text-warning">{stats.openTickets}</div>
            <div className="text-sm text-text-muted mt-1">Open</div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono text-success">{stats.resolvedTickets}</div>
            <div className="text-sm text-text-muted mt-1">Resolved</div>
          </div>
        </div>

        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">AI Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono">{stats.totalSuggestions}</div>
            <div className="text-sm text-text-muted mt-1">Suggestions</div>
          </div>
          <div className="glow-ai rounded-xl p-5 bg-surface">
            <div className="text-3xl font-semibold font-mono text-success">{acceptRate}%</div>
            <div className="text-sm text-text-muted mt-1">Accepted ({stats.accepted})</div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono text-warning">{editRate}%</div>
            <div className="text-sm text-text-muted mt-1">Edited ({stats.edited})</div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="text-3xl font-semibold font-mono text-danger">{rejectRate}%</div>
            <div className="text-sm text-text-muted mt-1">Rejected ({stats.rejected})</div>
          </div>
        </div>

        <p className="text-sm text-text-muted mt-8">
          Acceptance rate reflects how often agents used the AI-suggested reply as-is, indicating retrieval and generation quality.
        </p>
      </main>
    </div>
  )
}