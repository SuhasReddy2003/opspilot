'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type NotificationItem = {
  id: string
  subject: string
  created_at: string
}

export function useUnreadCount(role: 'customer' | 'agent' | 'admin', userId: string | undefined) {
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!userId) return

    async function loadItems() {
      if (role === 'customer') {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, subject, resolved_at')
          .eq('customer_id', userId)
          .eq('status', 'resolved')
          .order('resolved_at', { ascending: false })

        if (!tickets) return

        const lastSeen = JSON.parse(localStorage.getItem('resolveai_seen_tickets') || '{}')
        const unseen = tickets
          .filter((t) => !lastSeen[t.id])
          .map((t) => ({ id: t.id, subject: t.subject, created_at: t.resolved_at || '' }))
        setItems(unseen)
      }

      if (role === 'agent' || role === 'admin') {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, subject, created_at')
          .eq('status', 'open')
          .order('created_at', { ascending: false })

        if (!tickets) return

        const lastSeenTime = localStorage.getItem('resolveai_agent_last_seen_time') || '1970-01-01'
        const unseen = tickets.filter((t) => new Date(t.created_at) > new Date(lastSeenTime))
        setItems(unseen)
      }
    }

    loadItems()

    const channel = supabase
      .channel('unread-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        loadItems()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role, userId])

  function markAllSeen() {
    if (role === 'customer') {
      const seen: Record<string, boolean> = JSON.parse(localStorage.getItem('resolveai_seen_tickets') || '{}')
      items.forEach((item) => (seen[item.id] = true))
      localStorage.setItem('resolveai_seen_tickets', JSON.stringify(seen))
    } else {
      localStorage.setItem('resolveai_agent_last_seen_time', new Date().toISOString())
    }
    setItems([])
  }

  return { items, count: items.length, markAllSeen }
}