'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import NavBar from '@/components/NavBar'

type Ticket = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
}

const statusStyles: Record<string, string> = {
  open: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  resolved: 'bg-success/10 text-success border-success/20',
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

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profile?.role === 'agent') {
        router.push('/agent')
        return
      }
      if (profile?.role === 'admin') {
        router.push('/admin')
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

  if (!user) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="customer" email={user.email || ''} />

      <main className="max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-2xl font-semibold mb-1">My Tickets</h1>
        <p className="text-text-muted mb-8">Submit a request and track its status here.</p>

        <form onSubmit={handleCreateTicket} className="glass-card rounded-2xl p-6 mb-10 space-y-4">
          <h2 className="font-medium">New Ticket</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-muted">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              placeholder="Brief summary of the issue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none"
              placeholder="Describe what's going on in detail..."
            />
          </div>
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover transition font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        <h2 className="font-medium mb-4">Your Tickets ({tickets.length})</h2>
        {tickets.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-text-muted">
            No tickets yet. Submit one above to get started.
          </div>
        )}
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/${ticket.id}`}>
              <div className="glass-card rounded-xl p-5 hover:bg-surface-hover transition cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{ticket.subject}</h3>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusStyles[ticket.status] || ''}`}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-text-muted mb-2">{ticket.description}</p>
                <p className="text-xs text-text-muted font-mono">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}