create or replace function match_document_chunks(
  query_embedding vector(384),
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  title text,
  category text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_text,
    dc.chunk_index,
    d.title,
    d.category,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d
    on dc.document_id = d.id
  where dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;