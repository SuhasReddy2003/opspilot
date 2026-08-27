'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Ticket = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUserAndTickets() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.push('/login')
        return
      }
      setUser(authData.user)

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('customer_id', authData.user.id)
        .order('created_at', { ascending: false })

      if (ticketError) {
        setError(ticketError.message)
      } else {
        setTickets(ticketData || [])
      }
    }
    loadUserAndTickets()
  }, [router])

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (!user) return

    const { data, error: insertError } = await supabase
      .from('tickets')
      .insert({
        customer_id: user.id,
        subject,
        description,
        status: 'open',
      })
      .select()

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    if (data) {
      setTickets([data[0], ...tickets])
    }
    setSubject('')
    setDescription('')
    setSubmitting(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return <p style={{ padding: '40px' }}>Loading...</p>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Tickets</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
          Log Out
        </button>
      </div>
      <p>Logged in as: {user.email}</p>

      <h2 style={{ marginTop: '32px' }}>Create New Ticket</h2>
      <form onSubmit={handleCreateTicket} style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ padding: '10px 20px' }}>
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      <h2>My Tickets ({tickets.length})</h2>
      {tickets.length === 0 && <p>No tickets yet.</p>}
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          style={{
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
          }}
        >
          <strong>{ticket.subject}</strong> — <em>{ticket.status}</em>
          <p>{ticket.description}</p>
          <small>{new Date(ticket.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  )
}