'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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

      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('status')

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user || !stats) return <p style={{ padding: '40px' }}>Loading...</p>

  const totalFeedback = stats.accepted + stats.edited + stats.rejected
  const acceptRate = totalFeedback > 0 ? ((stats.accepted / totalFeedback) * 100).toFixed(1) : '0'
  const editRate = totalFeedback > 0 ? ((stats.edited / totalFeedback) * 100).toFixed(1) : '0'
  const rejectRate = totalFeedback > 0 ? ((stats.rejected / totalFeedback) * 100).toFixed(1) : '0'

  const cardStyle = {
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '20px',
    flex: 1,
    minWidth: '160px',
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Analytics</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
          Log Out
        </button>
      </div>
      <p>Logged in as: {user.email}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2 style={{ marginTop: '32px' }}>Ticket Overview</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.totalTickets}</div>
          <div>Total Tickets</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.openTickets}</div>
          <div>Open</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.resolvedTickets}</div>
          <div>Resolved</div>
        </div>
      </div>

      <h2 style={{ marginTop: '32px' }}>AI Performance</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{stats.totalSuggestions}</div>
          <div>Suggestions Generated</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'lightgreen' }}>{acceptRate}%</div>
          <div>Accepted ({stats.accepted})</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'orange' }}>{editRate}%</div>
          <div>Edited ({stats.edited})</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: 'salmon' }}>{rejectRate}%</div>
          <div>Rejected ({stats.rejected})</div>
        </div>
      </div>

      <p style={{ marginTop: '32px', color: '#888' }}>
        Acceptance rate reflects how often agents used the AI-suggested reply as-is, indicating retrieval and generation quality.
      </p>
    </div>
  )
}   