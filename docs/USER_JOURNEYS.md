# ResolveAI — User Journeys

## Journey 1: Customer submits a ticket (Alex)

1. Lands on homepage → clicks "Sign Up"
2. Fills signup form (email, password) → account created
3. Redirected to customer dashboard (empty state: "No tickets yet")
4. Clicks "New Ticket" → fills subject + description → submits
5. Ticket appears in their dashboard with status "Open"
6. Later: refreshes/logs in again → sees ticket status updated to "Resolved" with agent's reply visible

Pages needed:
- Landing/homepage
- Signup / Login
- Customer dashboard (ticket list)
- New ticket form
- Ticket detail view (customer's own ticket, read-only conversation)

## Journey 2: Agent resolves a ticket with AI assistance (Jordan)

1. Logs in with seeded agent account
2. Lands on agent dashboard → sees ticket queue (sorted by priority/status)
3. Clicks an open ticket
4. Sees: customer's message, AI-suggested reply, sources used (KB articles + similar past tickets), similarity/confidence scores
5. Reviews suggestion → chooses Accept / Edit / Reject
   - Accept: sends as-is
   - Edit: modifies text, then sends
   - Reject: writes own reply from scratch
6. Ticket marked "Resolved," feedback (accepted/edited/rejected) logged
7. Returns to queue → next ticket

Pages needed:
- Login (agent)
- Agent dashboard (ticket queue)
- Ticket detail view (agent) — includes AI suggestion panel + accept/edit/reject controls

## Journey 3: Admin reviews system health (Sam)

1. Logs in with seeded admin account
2. Lands on admin dashboard → sees high-level analytics (ticket volume, avg resolution time, AI acceptance rate)
3. Navigates to Knowledge Base section → views/adds NovaDesk docs used for retrieval
4. Navigates to RAG Evaluation page → sees retrieval accuracy / hallucination rate against test question set
5. Navigates to Agent Feedback breakdown → sees accepted/edited/rejected counts per agent or overall

Pages needed:
- Login (admin)
- Admin analytics dashboard
- Knowledge base management page
- RAG evaluation page

## Consolidated Page List (draft)

- Landing / homepage
- Signup / Login
- Customer dashboard
- New ticket form
- Ticket detail (customer view)
- Agent dashboard (ticket queue)
- Ticket detail (agent view, with AI panel)
- Admin dashboard (analytics)
- Knowledge base management
- RAG evaluation page