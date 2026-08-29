'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type NavBarProps = {
  role: 'customer' | 'agent' | 'admin'
  email: string
}

export default function NavBar({ role, email }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links: { href: string; label: string }[] = []

  if (role === 'customer') {
    links.push({ href: '/dashboard', label: 'My Tickets' })
  }
  if (role === 'agent' || role === 'admin') {
    links.push({ href: '/agent', label: 'Queue' })
  }
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
                  pathname === link.href
                    ? 'bg-surface-hover text-text'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
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