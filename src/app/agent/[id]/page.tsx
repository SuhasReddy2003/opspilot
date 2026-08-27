'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

type Message = {
  id: string
  sender_role: string
  content: string
  created_at: string
}

export default function AgentTicketDetail() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !ticket) return
    setSubmitting(true)
    setError('')

    const { data, error: msgError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: 'agent',
        content: reply,
      })
      .select()

    if (msgError) {
      setError(msgError.message)
      setSubmitting(false)
      return
    }

    if (data) {
      setMessages([...messages, data[0]])
    }

    await supabase
      .from('tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', ticket.id)

    setTicket({ ...ticket, status: 'resolved' })
    setReply('')
    setSubmitting(false)
  }

  if (!ticket) return <p style={{ padding: '40px' }}>Loading...</p>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <button onClick={() => router.push('/agent')} style={{ marginBottom: '20px' }}>
        ← Back to queue
      </button>

      <h1>{ticket.subject}</h1>
      <p><em>Status: {ticket.status}</em> — <em>Priority: {ticket.priority}</em></p>

      <div style={{ border: '1px solid #444', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <strong>Customer's original message:</strong>
        <p>{ticket.description}</p>
      </div>

      <h3>Conversation</h3>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            padding: '10px',
            marginBottom: '8px',
            backgroundColor: msg.sender_role === 'agent' ? '#1a3a1a' : '#2a2a2a',
            borderRadius: '6px',
          }}
        >
          <strong>{msg.sender_role}:</strong> {msg.content}
        </div>
      ))}

      {ticket.status !== 'resolved' && (
        <form onSubmit={handleSendReply} style={{ marginTop: '20px' }}>
          <label>Your reply</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            required
            rows={4}
            style={{ width: '100%', padding: '8px' }}
          />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{ padding: '10px 20px', marginTop: '8px' }}>
            {submitting ? 'Sending...' : 'Send Reply & Resolve'}
          </button>
        </form>
      )}

      {ticket.status === 'resolved' && <p style={{ color: 'lightgreen' }}>✅ Ticket resolved</p>}
    </div>
  )
}