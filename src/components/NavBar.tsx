'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUnreadCount } from '@/lib/useUnreadCount'

type NavBarProps = {
  role: 'customer' | 'agent' | 'admin'
  email: string
  userId?: string
}

export default function NavBar({ role, email, userId }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { items, count, markAllSeen } = useUnreadCount(role, userId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const primaryHref = role === 'customer' ? '/dashboard' : '/agent'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links: { href: string; label: string }[] = []
  if (role === 'customer') links.push({ href: '/dashboard', label: 'My Tickets' })
  if (role === 'agent' || role === 'admin') links.push({ href: '/agent', label: 'Queue' })
  if (role === 'admin') {
    links.push({ href: '/admin', label: 'Analytics' })
    links.push({ href: '/admin/evaluation', label: 'RAG Evaluation' })
  }

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-mono font-bold text-sm">
              R
            </div>
            <span className="font-semibold">ResolveAI</span>
            <span className="text-xs text-text-muted border border-border rounded-full px-2 py-0.5">
              {roleLabel}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  pathname === link.href ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative w-9 h-9 rounded-lg border border-border hover:bg-surface-hover transition flex items-center justify-center"
              aria-label="Notifications"
            >
              🔔
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ai text-[10px] font-bold text-bg flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 glass-card rounded-xl p-2 shadow-lg z-50">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Notifications
                  </span>
                  {count > 0 && (
                    <button
                      onClick={markAllSeen}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {items.length === 0 && (
                  <p className="text-sm text-text-muted px-2 py-3">You&apos;re all caught up.</p>
                )}
                {items.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={role === 'customer' ? `/dashboard/${item.id}` : `/agent/${item.id}`}
                    onClick={() => setDropdownOpen(false)}
                    className="block px-2 py-2 rounded-lg hover:bg-surface-hover transition"
                  >
                    <p className="text-sm font-medium truncate">{item.subject}</p>
                    <p className="text-xs text-text-muted">
                      {role === 'customer' ? 'Resolved' : 'New ticket'}
                      {item.created_at && ` · ${new Date(item.created_at).toLocaleString()}`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <span className="text-sm text-text-muted hidden sm:inline">{email}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  )
}