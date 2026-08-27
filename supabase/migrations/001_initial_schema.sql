-- users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('customer', 'agent', 'admin')),
  name text,
  created_at timestamptz default now()
);

-- tickets
create table tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references users(id),
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_agent_id uuid references users(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  sender_id uuid references users(id),
  sender_role text check (sender_role in ('customer', 'agent')),
  content text not null,
  created_at timestamptz default now()
);

-- documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  content text not null,
  created_at timestamptz default now()
);

-- document_chunks
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(384),
  chunk_index int
);

-- ai_suggestions
create table ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  suggested_text text not null,
  retrieved_chunks jsonb,
  model_used text,
  created_at timestamptz default now()
);

-- agent_feedback
create table agent_feedback (
  id uuid primary key default gen_random_uuid(),
  ai_suggestion_id uuid references ai_suggestions(id),
  agent_id uuid references users(id),
  outcome text check (outcome in ('accepted', 'edited', 'rejected')),
  final_text text,
  created_at timestamptz default now()
);


-- Enable RLS (should already be on, but this is safe to re-run)
alter table users enable row level security;
alter table tickets enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table ai_suggestions enable row level security;
alter table agent_feedback enable row level security;

-- USERS: a user can read their own row
create policy "Users can view own profile"
on users for select
using (auth.uid() = id);

-- TICKETS: customers can view their own tickets
create policy "Customers can view own tickets"
on tickets for select
using (auth.uid() = customer_id);

-- TICKETS: customers can create their own tickets
create policy "Customers can create own tickets"
on tickets for insert
with check (auth.uid() = customer_id);

-- TICKETS: agents/admins can view all tickets
create policy "Agents and admins can view all tickets"
on tickets for select
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- TICKETS: agents/admins can update tickets
create policy "Agents and admins can update tickets"
on tickets for update
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- MESSAGES: users can view messages on tickets they're involved in
create policy "Users can view messages on their tickets"
on messages for select
using (
  exists (
    select 1 from tickets
    where tickets.id = messages.ticket_id
    and (tickets.customer_id = auth.uid() or tickets.assigned_agent_id = auth.uid())
  )
  or exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- MESSAGES: users can insert messages on tickets they're involved in
create policy "Users can send messages on their tickets"
on messages for insert
with check (
  sender_id = auth.uid()
);

-- DOCUMENTS: agents/admins can view knowledge base
create policy "Agents and admins can view documents"
on documents for select
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- DOCUMENT_CHUNKS: agents/admins can view chunks
create policy "Agents and admins can view document chunks"
on document_chunks for select
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- AI_SUGGESTIONS: agents/admins can view suggestions
create policy "Agents and admins can view ai suggestions"
on ai_suggestions for select
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);

-- AGENT_FEEDBACK: agents can insert their own feedback
create policy "Agents can insert own feedback"
on agent_feedback for insert
with check (agent_id = auth.uid());

-- AGENT_FEEDBACK: agents/admins can view feedback
create policy "Agents and admins can view feedback"
on agent_feedback for select
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role in ('agent', 'admin')
  )
);