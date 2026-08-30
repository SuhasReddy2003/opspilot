'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

type Message = {
  id: string
  sender_role: string
  content: string
  created_at: string
}

const statusStyles: Record<string, string> = {
  open: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  resolved: 'bg-success/10 text-success border-success/20',
}

export default function CustomerTicketDetail() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.push('/login')
        return
      }
      setUser(authData.user)

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        setError(ticketError.message)
        return
      }
      setTicket(ticketData)

      const { data: messageData } = await supabase
        .from('messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      setMessages(messageData || [])
    }
    load()
  }, [ticketId, router])

  if (!user || !ticket) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="customer" email={user.email || ''} userId={user.id}/>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <Link href="/dashboard" className="text-sm text-text-muted hover:text-text transition inline-flex items-center gap-1.5 mb-6">
          ← Back to my tickets
        </Link>

        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize shrink-0 ${statusStyles[ticket.status] || ''}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-medium text-text-muted mb-1 uppercase tracking-wide">You</p>
            <p className="text-sm">{ticket.description}</p>
            <p className="text-xs text-text-muted font-mono mt-2">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-5 border ${
                msg.sender_role === 'agent' ? 'bg-success/5 border-success/20' : 'glass-card'
              }`}
            >
              <p className="text-xs font-medium text-text-muted mb-1 uppercase tracking-wide">
                {msg.sender_role === 'agent' ? 'Support Team' : 'You'}
              </p>
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs text-text-muted font-mono mt-2">
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="glass-card rounded-xl p-5 text-sm text-text-muted">
              No response yet. Our team will get back to you soon.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}