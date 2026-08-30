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

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')

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

  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }

  const filteredTickets = tickets
    .filter((t) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return priorityRank[a.priority] - priorityRank[b.priority]
    })

  if (!user) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  const selectClass =
    'px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition'

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="agent" email={user.email || ''} />

      <main className="max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-2xl font-semibold mb-1">Support Queue</h1>
        <p className="text-text-muted mb-6">
          {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} shown
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg bg-surface border border-border text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={selectClass}>
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={selectClass}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {error && <p className="text-danger mb-4">{error}</p>}

        {filteredTickets.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-text-muted">
            No tickets match your filters.
          </div>
        )}

        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
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