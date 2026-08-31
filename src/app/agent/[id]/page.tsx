'use client'

import { useEffect, useState, useCallback } from 'react'
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

type RetrievedChunk = {
  id: string
  title: string
  category: string
  chunk_text: string
  similarity: number
}

type Suggestion = {
  id: string
  suggested_text: string
  retrieved_chunks: RetrievedChunk[]
  model_used: string
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

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)

    const generateSuggestion = useCallback(async (customerMessage: string) => {
    setLoadingSuggestion(true)
    setSuggestionError('')
    try {
      const response = await fetch('/api/generate-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, customerMessage }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed (${response.status})`)
      }

      const data = await response.json()
      if (data.suggestion) {
        setSuggestion(data.suggestion)
      } else {
        throw new Error('No suggestion returned')
      }
    } catch (err) {
      console.error('Failed to generate suggestion', err)
      setSuggestionError(
        err instanceof Error ? err.message : 'AI suggestion unavailable right now'
      )
    } finally {
      setLoadingSuggestion(false)
    }
  }, [ticketId])
  
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

      const { data: existingSuggestion } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSuggestion) {
        setSuggestion(existingSuggestion)
      } else if (ticketData.status !== 'resolved') {
        generateSuggestion(ticketData.description)
      }
    }
    load()
    }, [ticketId, router, generateSuggestion])


  async function handleFeedback(outcome: 'accepted' | 'edited' | 'rejected') {
    if (!user || !suggestion) return

    await supabase.from('agent_feedback').insert({
      ai_suggestion_id: suggestion.id,
      agent_id: user.id,
      outcome,
      final_text: reply || suggestion.suggested_text,
    })

    setFeedbackGiven(outcome)

    if (outcome === 'accepted' || outcome === 'edited') {
      setReply(suggestion.suggested_text)
    }
  }

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

  if (!ticket) return <div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>

  return (
    <div className="flex-1 flex flex-col">
      <NavBar role="agent" email={user?.email || ''} userId={user?.id} />
      <div className="max-w-3xl mx-auto w-full px-6 pt-6">
        <Link href="/agent" className="text-sm text-text-muted hover:text-text transition inline-flex items-center gap-1.5">
          ← Back to queue
        </Link>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        <div className="flex items-center justify-between mb-2 gap-3">
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${priorityStyles[ticket.priority] || ''}`}>
              {ticket.priority}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusStyles[ticket.status] || ''}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 mb-6 mt-6">
          <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Customer&apos;s original message</p>
          <p className="text-text">{ticket.description}</p>
        </div>

        {messages.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-text-muted mb-3 uppercase tracking-wide">Conversation</p>
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-4 border ${
                    msg.sender_role === 'agent'
                      ? 'bg-success/5 border-success/20'
                      : 'bg-surface border-border'
                  }`}
                >
                  <p className="text-xs font-medium text-text-muted mb-1 capitalize">{msg.sender_role}</p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ticket.status !== 'resolved' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-ai/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-ai" />
              </div>
              <p className="text-xs font-medium text-ai uppercase tracking-wide">AI Suggested Reply</p>
            </div>

            {loadingSuggestion && (
              <div className="glow-ai rounded-xl p-5 mb-6 bg-surface text-text-muted text-sm">
                Generating suggestion...
              </div>
            )}

            {suggestionError && !loadingSuggestion && (
              <div className="rounded-xl p-5 mb-6 bg-danger/5 border border-danger/20">
                <p className="text-sm text-danger font-medium mb-1">AI suggestion unavailable</p>
                <p className="text-xs text-text-muted mb-3">{suggestionError}</p>
                <p className="text-xs text-text-muted">
                  You can still reply to the customer manually using the form below.
                </p>
              </div>
            )}

            {suggestion && (
              <div className="glow-ai rounded-xl p-5 mb-6 bg-surface">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{suggestion.suggested_text}</p>

                <button
                  onClick={() => setShowSources(!showSources)}
                  className="text-xs text-ai hover:text-ai/80 transition mt-4 font-medium inline-flex items-center gap-1"
                >
                  {showSources ? '▼' : '▶'} View sources ({suggestion.retrieved_chunks?.length || 0})
                </button>

                {showSources && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {suggestion.retrieved_chunks?.map((chunk) => (
                      <div key={chunk.id} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-text">
                            {chunk.title} <span className="text-text-muted font-normal">({chunk.category})</span>
                          </span>
                          <span className="font-mono text-ai">{(chunk.similarity * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-text-muted italic">&quot;{chunk.chunk_text}&quot;</p>
                      </div>
                    ))}
                  </div>
                )}

                {!feedbackGiven && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleFeedback('accepted')}
                      className="text-sm px-3 py-1.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => {
                        setReply(suggestion.suggested_text)
                        handleFeedback('edited')
                      }}
                      className="text-sm px-3 py-1.5 rounded-lg bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => handleFeedback('rejected')}
                      className="text-sm px-3 py-1.5 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
                {feedbackGiven && (
                  <p className="text-xs text-success mt-4 font-medium">✓ Feedback recorded: {feedbackGiven}</p>
                )}
              </div>
            )}

            <form onSubmit={handleSendReply} className="glass-card rounded-xl p-5">
              <label className="block text-sm font-medium mb-2 text-text-muted">Your reply</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none text-sm"
                placeholder="Write your reply..."
              />
              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mt-3">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover transition font-medium disabled:opacity-50 mt-3"
              >
                {submitting ? 'Sending...' : 'Send Reply & Resolve'}
              </button>
            </form>
          </>
        )}

        {ticket.status === 'resolved' && (
          <div className="glass-card rounded-xl p-5 text-success text-sm font-medium">
            ✓ Ticket resolved
          </div>
        )}
      </main>
    </div>
  )
}