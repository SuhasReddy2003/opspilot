import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import evalQuestions from '@/data/eval-questions.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

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

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase()
  const billingKeywords = ['charge', 'refund', 'invoice', 'payment', 'subscription', 'bill', 'cancel', 'price', 'cost']
  const apiKeywords = ['api', 'error', 'rate limit', '429', '401', '403', '404', '500', 'webhook', 'authentication', 'endpoint', 'request']
  const productKeywords = ['team', 'member', 'permission', 'account', 'workspace', 'integration', 'slack', 'setup', 'admin', 'role']

  const billingScore = billingKeywords.filter((k) => lower.includes(k)).length
  const apiScore = apiKeywords.filter((k) => lower.includes(k)).length
  const productScore = productKeywords.filter((k) => lower.includes(k)).length

  const max = Math.max(billingScore, apiScore, productScore)
  if (max === 0) return null

  if (billingScore === max) return 'Billing'
  if (apiScore === max) return 'API'
  return 'Product'
}

export async function GET() {
  const results = []

  for (const item of evalQuestions) {
    try {
      const embedding = await getEmbedding(item.question)
      const detectedCategory = detectCategory(item.question)

      const { data: matches, error } = await supabase.rpc('match_document_chunks_filtered', {
        query_embedding: embedding,
        match_count: 3,
        filter_category: detectedCategory,
      })

      if (error) {
        results.push({
          question: item.question,
          expected_topic: item.expected_topic,
          detected_category: detectedCategory,
          top_result: null,
          top_similarity: 0,
          correct: false,
          error: error.message,
        })
        continue
      }

      const topMatch = matches?.[0]
      const correct = topMatch?.title === item.expected_topic

      results.push({
        question: item.question,
        expected_topic: item.expected_topic,
        detected_category: detectedCategory,
        top_result: topMatch?.title || null,
        top_similarity: topMatch?.similarity || 0,
        correct,
      })
    } catch (err) {
      results.push({
        question: item.question,
        expected_topic: item.expected_topic,
        detected_category: null,
        top_result: null,
        top_similarity: 0,
        correct: false,
        error: String(err),
      })
    }
  }

  const correctCount = results.filter((r) => r.correct).length
  const accuracy = ((correctCount / results.length) * 100).toFixed(1)
  const avgSimilarity = (
    (results.reduce((sum, r) => sum + r.top_similarity, 0) / results.length) *
    100
  ).toFixed(1)

  return NextResponse.json({
    results,
    summary: {
      totalQuestions: results.length,
      correctCount,
      accuracy: parseFloat(accuracy),
      avgSimilarity: parseFloat(avgSimilarity),
    },
  })
}