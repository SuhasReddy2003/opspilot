# ResolveAI — User Personas

## 1. Customer — "Alex"
- Signs up on the platform, submits support tickets for issues with NovaDesk (billing, API, account).
- Wants: fast, accurate answers; ability to track ticket status.
- Access: can only see/manage their own tickets.
- Auth: self-registration via signup form.

## 2. Support Agent — "Jordan"
- Works through a queue of open tickets.
- Opens a ticket, sees an AI-suggested reply with sources and confidence scores.
- Accepts, edits, or rejects the suggestion before responding.
- Wants: fast, trustworthy AI assistance that reduces repetitive typing without giving wrong answers.
- Access: sees all tickets, can respond to any.
- Auth: seeded demo account (not public signup).

## 3. Admin — "Sam"
- Manages the knowledge base (adds/edits NovaDesk docs used for retrieval).
- Views analytics: ticket volume, resolution time, AI acceptance/edit/rejection rates.
- Views the RAG evaluation page (retrieval accuracy, hallucination rate on test set).
- Wants: visibility into whether the AI is actually helping or creating more work.
- Access: full visibility, no ticket-handling duties.
- Auth: seeded demo account (not public signup).