import Link from 'next/link'
import LiveDemoWidget from '@/components/LiveDemoWidget'

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-mono font-bold text-sm">
              R
            </div>
            <span className="font-semibold">ResolveAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg hover:bg-surface-hover transition">
              Log In
            </Link>
            <Link href="/signup" className="text-sm px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover transition font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-20 pb-16">
        <div className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-medium text-ai bg-ai/10 border border-ai/20 rounded-full px-3 py-1 mb-7">
          <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
          Retrieval-Augmented Generation, in production
        </div>

        <h1
          className="animate-fade-in-up text-5xl sm:text-6xl font-semibold max-w-3xl leading-[1.1] mb-6 text-center"
          style={{ animationDelay: '0.1s' }}
        >
          Support replies, grounded in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-ai to-primary bg-[length:200%_auto]">
            real answers
          </span>
          , not guesses
        </h1>

        <p
          className="animate-fade-in-up text-text-muted max-w-xl mb-10 text-lg text-center"
          style={{ animationDelay: '0.2s' }}
        >
          ResolveAI retrieves the exact knowledge base articles behind every AI-suggested reply —
          with sources and confidence scores visible, and every suggestion reviewed by a human
          before it ships.
        </p>

        <div
          className="animate-fade-in-up flex items-center gap-3 mb-16"
          style={{ animationDelay: '0.3s' }}
        >
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover transition font-medium"
          >
            Try it as a customer
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-border hover:bg-surface-hover transition font-medium"
          >
            Log in
          </Link>
        </div>

        <div
          className="animate-fade-in-up w-full max-w-2xl mb-16"
          style={{ animationDelay: '0.4s' }}
        >
          <LiveDemoWidget />
        </div>

        <div
          className="animate-fade-in-up grid grid-cols-3 gap-4 max-w-2xl w-full mb-16"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="glass-card rounded-xl p-5 text-center">
            <div className="text-3xl font-semibold font-mono text-ai">80%</div>
            <div className="text-xs text-text-muted mt-1">Retrieval Accuracy</div>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <div className="text-3xl font-semibold font-mono">$0</div>
            <div className="text-xs text-text-muted mt-1">Infra Cost</div>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <div className="text-3xl font-semibold font-mono">100%</div>
            <div className="text-xs text-text-muted mt-1">Human Reviewed</div>
          </div>
        </div>

        <div
          className="animate-fade-in-up glass-card rounded-2xl p-6 max-w-xl w-full text-left"
          style={{ animationDelay: '0.6s' }}
        >
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
            Demo accounts — no signup needed
          </p>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Agent</span>
              <span>agent@resolveai.demo / Agent123!</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Admin</span>
              <span>admin@resolveai.demo / Admin123!</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-text-muted">
          Built with Next.js, Supabase, pgvector, Hugging Face, and Groq.{' '}
          <a
            href="https://github.com/SuhasReddy2003/opspilot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover"
          >
            View source
          </a>
        </div>
      </footer>
    </div>
  )
}