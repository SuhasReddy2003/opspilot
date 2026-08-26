# ResolveAI — Database Schema

## users
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | Supabase auth user id |
| email | text, unique | |
| role | text | 'customer' \| 'agent' \| 'admin' |
| name | text | |
| created_at | timestamptz | default now() |

## tickets
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| customer_id | uuid, FK -> users.id | |
| subject | text | |
| description | text | initial customer message |
| status | text | 'open' \| 'in_progress' \| 'resolved' |
| priority | text | 'low' \| 'medium' \| 'high' |
| assigned_agent_id | uuid, FK -> users.id, nullable | |
| created_at | timestamptz | |
| resolved_at | timestamptz, nullable | |

## messages
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| ticket_id | uuid, FK -> tickets.id | |
| sender_id | uuid, FK -> users.id | |
| sender_role | text | 'customer' \| 'agent' | denormalized for convenience |
| content | text | |
| created_at | timestamptz | |

## documents
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| title | text | e.g. "Refund Policy" |
| category | text | e.g. "Billing", "API" |
| content | text | full document text |
| created_at | timestamptz | |

## document_chunks
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| document_id | uuid, FK -> documents.id | |
| chunk_text | text | a slice of the parent document |
| embedding | vector(1536) | pgvector column; dimension depends on embedding model used |
| chunk_index | int | order within the document |

## ai_suggestions
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| ticket_id | uuid, FK -> tickets.id | |
| suggested_text | text | the AI-generated reply |
| retrieved_chunks | jsonb | array of {chunk_id, similarity_score, source_title} used as context |
| model_used | text | e.g. "llama-3.1-8b" |
| created_at | timestamptz | |

## agent_feedback
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| ai_suggestion_id | uuid, FK -> ai_suggestions.id | |
| agent_id | uuid, FK -> users.id | |
| outcome | text | 'accepted' \| 'edited' \| 'rejected' |
| final_text | text | what was actually sent (same as suggestion if accepted) |
| created_at | timestamptz | |

## Relationships summary

- One customer → many tickets
- One ticket → many messages
- One ticket → many ai_suggestions (usually one active, but history is kept)
- One ai_suggestion → one agent_feedback
- One document → many document_chunks
- document_chunks.embedding is queried via pgvector cosine similarity to find relevant chunks + similar past tickets (past resolved tickets can be treated as documents too, or queried directly via a separate embedding on tickets — decide during implementation)

## Notes for implementation

- `vector(1536)` assumes an OpenAI-style embedding dimension; if using a different free embedding model (e.g. a 384 or 768-dim model), adjust this number to match.
- Enable the pgvector extension in Supabase before creating document_chunks: `create extension if not exists vector;`
- Index document_chunks.embedding with an IVFFlat or HNSW index once you have enough rows, for faster search (not needed at small scale).