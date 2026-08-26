# ResolveAI — Project Context

## Project Overview

ResolveAI is an AI-powered customer support platform built as a production-grade full-stack portfolio project. It demonstrates full-stack development, authentication, database design, API design, and a correctly implemented, human-in-the-loop RAG (Retrieval-Augmented Generation) pipeline.

## Product Concept

Customers submit support tickets for a fictional SaaS company ("NovaDesk"). When an agent opens a ticket, ResolveAI retrieves relevant knowledge base articles and similar past resolved tickets, then generates a grounded suggested reply — with sources and confidence scores shown. The agent accepts, edits, or rejects the suggestion, and that feedback is tracked and surfaced in analytics.

## Target Users
- Customers — submit and track support tickets
- Agents — resolve tickets, review AI-suggested replies with visible sources
- Admins — manage users, view analytics and AI evaluation metrics

## Core Features (MVP scope, phased)

### Phase 1 — Foundation
- Authentication (customer / agent / admin roles)
- Customers can create and view their own tickets
- Agents see a ticket queue and open/respond to tickets
- PostgreSQL schema: users, tickets, messages

### Phase 2 — Knowledge & Retrieval
- Small fictional knowledge base (~10-15 docs to start) for "NovaDesk"
- ~20-30 fictional historical resolved tickets for retrieval material
- Document chunking + embeddings, stored via pgvector
- Vector similarity search (top-k retrieval)

### Phase 3 — RAG Generation
- On ticket open: retrieve relevant KB articles + similar past tickets
- LLM generates a suggested reply grounded in retrieved context
- UI shows: suggested reply, sources used, similarity/confidence scores
- Agent can Accept / Edit / Reject the suggestion

### Phase 4 — Feedback & Analytics
- Store agent feedback (accepted / edited / rejected) per suggestion
- Analytics dashboard: ticket volume, resolution time, AI acceptance/edit/rejection rate
- Small RAG evaluation page: a curated set of test questions with retrieval accuracy / answer relevance scored manually or semi-automatically

### Phase 5 — Polish
- Tests
- Clean README with architecture diagram + screenshots/demo GIF
- Deployment (all free tier)

## Explicitly Out of Scope

- Orders management, billing/payments, public marketing site
- Multi-tenant support
- Separate microservices (keeping this a single Next.js app initially — see Technology)
- Advanced agentic tool-calling

## Technology (planned, free-tier only)

- Frontend + Backend: Next.js (App Router, TypeScript) — API routes handle backend logic, kept as a single app initially to reduce deployment complexity. May be documented as a future FastAPI split if time allows.
- Database + Auth: Supabase (free tier) — Postgres with pgvector built in
- LLM: Groq free API (or free credits from Anthropic/OpenAI) for generation
- Embeddings: free/open embedding model
- Hosting: Vercel (frontend/API), Supabase (DB) — all free tier

## Project Status

Planning / Discovery — Phase 1 complete, moving into Requirements & Design.

### Completed
- Project concept defined
- GitHub repository created and initialized
- MVP scope + phased plan defined
- Project renamed to ResolveAI

### Current Work
Defining user personas and user journeys before architecture/schema design.

### Next Steps
- User personas
- User journeys
- Database schema design
- API design
- Tech stack finalization
- UI wireframes
- Implementation (Phase 1)