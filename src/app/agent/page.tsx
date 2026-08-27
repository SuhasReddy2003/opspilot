'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Ticket = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  customer_id: string
}

export default function AgentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUserAndTickets() {
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

      if (!profile || (profile.role !== 'agent' && profile.role !== 'admin')) {
        router.push('/dashboard')
        return
      }

      setUser(authData.user)

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (ticketError) {
        setError(ticketError.message)
      } else {
        setTickets(ticketData || [])
      }
    }
    loadUserAndTickets()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return <p style={{ padding: '40px' }}>Loading...</p>

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '🔴'
    if (priority === 'medium') return '🟡'
    return '🟢'
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Support Queue</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
          Log Out
        </button>
      </div>
      <p>Logged in as: {user.email}</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Tickets ({tickets.length})</h2>
      {tickets.length === 0 && <p>No tickets yet.</p>}
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/agent/${ticket.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            style={{
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              cursor: 'pointer',
            }}
          >
            <strong>{priorityColor(ticket.priority)} {ticket.subject}</strong> — <em>{ticket.status}</em>
            <p>{ticket.description}</p>
            <small>{new Date(ticket.created_at).toLocaleString()}</small>
          </div>
        </Link>
      ))}
    </div>
  )
}