import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { detectCategory } from '@/lib/rag-utils'
import { checkRateLimit } from '@/lib/rate-limit'

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
  if (!response.ok) throw new Error(`Embedding failed: ${response.status}`)
  return response.json()
}

export async function POST(req: NextRequest) {
  // Stricter rate limit for the public, no-login demo: 5 requests per IP per 10 minutes
  const identifier = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = checkRateLimit(`public-demo:${identifier}`)
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: `Demo rate limit reached. Try again in ${rateLimitResult.retryAfterSeconds}s.` }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { question } = await req.json()
  if (!question || typeof question !== 'string' || question.length > 300) {
    return new Response(JSON.stringify({ error: 'Invalid question' }), { status: 400 })
  }

  try {
    const queryEmbedding = await getEmbedding(question)
    const detectedCategory = detectCategory(question)

    const { data: matches } = await supabase.rpc('match_document_chunks_filtered', {
      query_embedding: queryEmbedding,
      match_count: 3,
      filter_category: detectedCategory,
    })

    const context = (matches || [])
      .map((m: { chunk_text: string }, i: number) => `[Source ${i + 1}]: ${m.chunk_text}`)
      .join('\n\n')

    const sources = (matches || []).map((m: { title: string; category: string; similarity: number }) => ({
      title: m.title,
      category: m.category,
      similarity: m.similarity,
    }))

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Send sources first, as a single JSON line, so the frontend can render them immediately
        controller.enqueue(encoder.encode(`__SOURCES__${JSON.stringify(sources)}\n`))

        const completion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful customer support agent for NovaDesk, a fictional SaaS company. Answer using ONLY the provided sources. If the sources do not contain a relevant answer, say so honestly. Keep replies concise (2-4 sentences).',
            },
            {
              role: 'user',
              content: `Sources:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
            },
          ],
          stream: true,
        })

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content || ''
          if (token) {
            controller.enqueue(encoder.encode(token))
          }
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('Public demo error:', err)
    return new Response(JSON.stringify({ error: 'Demo temporarily unavailable' }), { status: 500 })
  }
}