import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { detectCategory } from '@/lib/rag-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

async function getEmbedding(text: string, retries = 2): Promise<number[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      if (!response.ok) {
        // Retry on server errors or rate limits, but not on bad requests (400s except 429)
        if ((response.status >= 500 || response.status === 429) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))) // backoff
          continue
        }
        throw new Error(`Embedding API failed: ${response.status}`)
      }

      return response.json()
    } catch (err) {
      if (attempt === retries) {
        throw new Error(
          err instanceof Error && err.name === 'AbortError'
            ? 'Embedding request timed out'
            : `Embedding request failed: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }
  throw new Error('Embedding failed after retries')
}

export async function POST(req: NextRequest) {
  try {
    const { ticketId, customerMessage } = await req.json()

    if (!ticketId || !customerMessage) {
      return NextResponse.json({ error: 'Missing ticketId or customerMessage' }, { status: 400 })
    }

    // Pull the full conversation so far, so context isn't limited to the first message
    const { data: priorMessages } = await supabase
      .from('messages')
      .select('sender_role, content')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    const conversationHistory = (priorMessages || [])
      .map((m) => `${m.sender_role === 'agent' ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n')

    const fullContext = conversationHistory
      ? `Customer: ${customerMessage}\n${conversationHistory}`
      : customerMessage

    // 1. Embed the customer's message
    const queryEmbedding = await getEmbedding(fullContext)

        // 2. Guess the likely category using simple keyword matching

    const detectedCategory = detectCategory(customerMessage)

    // 3. Vector search for relevant chunks, filtered by detected category when confident
    const { data: matches, error: matchError } = await supabase.rpc('match_document_chunks_filtered', {
      query_embedding: queryEmbedding,
      match_count: 3,
      filter_category: detectedCategory,
    })

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }

    
    const context = (matches || [])
      .map((m: { chunk_text: string }, i: number) => `[Source ${i + 1}]: ${m.chunk_text}`)
      .join('\n\n')

    // 4. Generate a suggested reply grounded in that context
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful customer support agent for NovaDesk. Answer the customer using ONLY the information in the provided sources. If the sources do not contain a relevant answer, say you are not certain and recommend escalating. Pay close attention to the full conversation history, not just the latest message — if the customer has mentioned something recurring, urgent, or previously discussed, acknowledge it directly rather than giving a generic first-time response. Keep replies concise and professional.',
        },
        {
          role: 'user',
          content: `Sources:\n${context}\n\nConversation so far:\n${fullContext}\n\nWrite a suggested reply to the customer's latest message, taking the full conversation into account.`,
        },
      ],
    })

    const suggestedText = completion.choices[0].message.content

    // 5. Store the suggestion
    const { data: suggestionRow, error: insertError } = await supabase
      .from('ai_suggestions')
      .insert({
        ticket_id: ticketId,
        suggested_text: suggestedText,
        retrieved_chunks: matches,
        model_used: 'openai/gpt-oss-20b',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ suggestion: suggestionRow })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 })
  }
}