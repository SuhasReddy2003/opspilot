# ResolveAI

AI-powered customer support platform with a retrieval-augmented, human-in-the-loop RAG pipeline. Built as a full-stack portfolio project demonstrating authentication, database design, semantic search, and grounded LLM generation.

**Live demo:** [opspilot-woad.vercel.app](https://opspilot-woad.vercel.app)

Demo accounts (no signup needed):
| Role | Email | Password |
|---|---|---|
| Agent | `agent@resolveai.demo` | `Agent123!` |
| Admin | `admin@resolveai.demo` | `Admin123!` |

(Or sign up as a new customer directly from the live site.)

---

## What it does

Customers submit support tickets for a fictional SaaS company, **NovaDesk**. When an agent opens a ticket, ResolveAI:

1. Embeds the customer's message
2. Searches a knowledge base of NovaDesk documentation using vector similarity (pgvector)
3. Retrieves the most relevant articles
4. Generates a grounded reply using an LLM, citing the retrieved sources
5. Shows the agent the suggestion **with its sources and similarity scores** — not just an opaque answer
6. Lets the agent Accept, Edit, or Reject the suggestion
7. Logs that feedback and surfaces it in an analytics dashboard

A separate evaluation page runs a curated set of test questions against the retrieval system and reports retrieval accuracy — treating "does the AI actually retrieve the right thing" as a measurable, testable property rather than a vibe.

## Architecture

```
                 +--------------+
                 |   Customer   |
                 +------+-------+
                        |
                        v
                 +--------------+
                 |   Next.js    |
                 | (App Router) |
                 +------+-------+
                        |
          +-------------+--------------+
          v             v              v
    +----------+  +-----------+  +----------+
    | Supabase |  |  RAG API  |  | Supabase |
    | Postgres |  |  Route    |  |   Auth   |
    |+pgvector |  |           |  |          |
    +----------+  +-----+-----+  +----------+
                         |
          +--------------+---------------+
          v                              v
 +--------------------+       +---------------------+
 |   Hugging Face     |       |        Groq         |
 |  Embeddings API    |       |   (LLM inference)   |
 |  (MiniLM-L6-v2)    |       |  openai/gpt-oss-20b |
 +--------------------+       +---------------------+
```
 
**Why these choices:**
- **Single Next.js app, not separate frontend/backend services** — API routes handle retrieval + generation server-side. Fewer moving parts to deploy and keep alive on free-tier infrastructure; a real production system serving significant traffic would likely split this out.
- **pgvector over a dedicated vector database** — Supabase's Postgres already supports vector similarity search natively. Avoids introducing and paying for a second data store for a workload this size.
- **Hosted embedding API over a local model** — running an embedding model in-process (e.g. via `@xenova/transformers`) pulls in native binary dependencies that are fragile to deploy on serverless platforms like Vercel. A hosted API trades a small amount of latency for deployment reliability.
- **Row Level Security (RLS) for authorization** — access control (customers see only their own tickets; agents see all) is enforced at the database layer via Postgres policies, not just in application code, so it holds even if a request bypasses the UI.

## Features

- **Authentication** — customer self-signup; agent/admin accounts are seeded (not publicly registrable), matching how real internal support tools are provisioned
- **Role-based access** — customer, agent, and admin views, each with different permissions enforced via RLS
- **RAG pipeline** — semantic retrieval over a knowledge base of ~12 NovaDesk support articles, with visible source citations and similarity scores on every AI suggestion
- **Human-in-the-loop feedback** — agents accept, edit, or reject AI suggestions; every outcome is logged
- **Analytics dashboard** — ticket volume, resolution status, and AI performance (acceptance/edit/rejection rates)
- **RAG evaluation** — a 10-question curated test set measuring retrieval accuracy (currently ~70% top-1 accuracy; failure cases are documented and explainable — see below)

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Database + Auth | Supabase (Postgres, pgvector, Row Level Security) |
| Embeddings | Hugging Face Inference API — `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| LLM | Groq — `openai/gpt-oss-20b` |
| Hosting | Vercel |

All free-tier, $0 infrastructure cost.

## Retrieval evaluation

Run against a 10-question test set mapped to expected source articles:

- **Retrieval accuracy: 70%** (7/10 correct top-1 retrieval)
- **Average top similarity: 53.4%**

Failure analysis: the 3 misses are not random noise — they're driven by genuine content overlap between similar knowledge base articles (e.g., a query about API rate limits matched an "API Error Codes" article that also mentions status code 429). This points to a concrete improvement path: tighter chunk boundaries or metadata-based filtering to reduce cross-document ambiguity, rather than a fundamentally broken retrieval approach.

## Local setup

```bash
git clone https://github.com/SuhasReddy2003/opspilot.git
cd opspilot
npm install
```

Create a `.env.local` file with the following keys (values come from your own Supabase, Hugging Face, and Groq accounts):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
HUGGINGFACE_API_KEY=
GROQ_API_KEY=
```


Set up the database schema and RLS policies (see `supabase/migrations/001_initial_schema.sql`), then seed the knowledge base:
```bash
npm run seed
```

Run locally:
```bash
npm run dev
```

## Project docs

Full scope, personas, user journeys, and database schema documented in `docs/`:
- `PROJECT_CONTEXT.md`
- `PERSONAS.md`
- `USER_JOURNEYS.md`
- `DATABASE_SCHEMA.md`

## What I'd do differently with more time

- Split the RAG API into a separate service (e.g. FastAPI) to demonstrate independent scaling of the AI workload
- Add metadata filtering (category-based) to retrieval to reduce cross-document confusion
- Expand the evaluation set beyond 10 questions and automate scoring
- Add automated tests and CI/CD