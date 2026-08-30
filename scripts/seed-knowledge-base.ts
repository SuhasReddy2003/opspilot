import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import documents from '../src/data/kb-documents.json'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!
const hfApiKey = process.env.HUGGINGFACE_API_KEY!

const supabase = createClient(supabaseUrl, supabaseSecretKey)

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Embedding API failed: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result as number[]
}

import { chunkText } from '../src/lib/rag-utils'

async function seed() {
  console.log(`Seeding ${documents.length} documents...`)

  for (const doc of documents) {
    console.log(`\nProcessing: ${doc.title}`)

    const { data: docRow, error: docError } = await supabase
      .from('documents')
      .insert({
        title: doc.title,
        category: doc.category,
        content: doc.content,
      })
      .select()
      .single()

    if (docError) {
      console.error(`Failed to insert document "${doc.title}":`, docError.message)
      continue
    }

    const chunks = chunkText(doc.content)
    console.log(`  Split into ${chunks.length} chunk(s)`)

    for (let i = 0; i < chunks.length; i++) {
      const chunkTextValue = chunks[i]
      try {
        const embedding = await getEmbedding(chunkTextValue)

        const { error: chunkError } = await supabase.from('document_chunks').insert({
          document_id: docRow.id,
          chunk_text: chunkTextValue,
          embedding: embedding,
          chunk_index: i,
        })

        if (chunkError) {
          console.error(`  Failed to insert chunk ${i}:`, chunkError.message)
        } else {
          console.log(`  ✓ Chunk ${i} embedded and stored`)
        }
      } catch (err) {
        console.error(`  Error embedding chunk ${i}:`, err)
      }
    }
  }

  console.log('\nSeeding complete!')
}

seed()