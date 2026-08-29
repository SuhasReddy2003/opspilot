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

const priorityStyles: Record<string, string> = {
  high: 'bg-danger/10 text-danger border-danger/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
}

const statusStyles: Record<string, string> = {
  open: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  resolved: 'bg-success/10 text-success border-success/20',
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

  if (!user) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-mono font-bold text-sm">
              R
            </div>
            <span className="font-semibold">ResolveAI</span>
            <span className="text-xs text-text-muted border border-border rounded-full px-2 py-0.5 ml-2">
              Agent
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-2xl font-semibold mb-1">Support Queue</h1>
        <p className="text-text-muted mb-8">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total</p>

        {error && <p className="text-danger mb-4">{error}</p>}

        {tickets.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-text-muted">
            No tickets in the queue.
          </div>
        )}

        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/agent/${ticket.id}`}>
              <div className="glass-card rounded-xl p-5 hover:bg-surface-hover transition cursor-pointer">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <h3 className="font-medium truncate">{ticket.subject}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${priorityStyles[ticket.priority] || ''}`}
                    >
                      {ticket.priority}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusStyles[ticket.status] || ''}`}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-muted mb-2 line-clamp-1">{ticket.description}</p>
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