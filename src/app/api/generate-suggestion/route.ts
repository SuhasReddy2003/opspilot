import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  )
  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`)
  }
  return response.json()
}

export async function POST(req: NextRequest) {
  try {
    const { ticketId, customerMessage } = await req.json()

    if (!ticketId || !customerMessage) {
      return NextResponse.json({ error: 'Missing ticketId or customerMessage' }, { status: 400 })
    }

    // 1. Embed the customer's message
    const queryEmbedding = await getEmbedding(customerMessage)

    // 2. Vector search for relevant chunks
    const { data: matches, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_count: 3,
    })

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }

    // 3. Build context from retrieved chunks
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
            'You are a helpful customer support agent for NovaDesk. Answer the customer using ONLY the information in the provided sources. If the sources do not contain a relevant answer, say you are not certain and recommend escalating. Keep replies concise and professional.',
        },
        {
          role: 'user',
          content: `Sources:\n${context}\n\nCustomer message: ${customerMessage}\n\nWrite a suggested reply.`,
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