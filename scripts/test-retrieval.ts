import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

type RetrievalResult = {
  id: string
  document_id: string
  chunk_text: string
  chunk_index: number
  title: string
  category: string
  similarity: number
}

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;
const huggingFaceKey = process.env.HUGGINGFACE_API_KEY!;

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingFaceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      inputs: text,
      options: {
      wait_for_model: true,
        },
    }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face error: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Hugging Face can return either:
  // [384 numbers]
  // or [[384 numbers]]
  if (Array.isArray(data[0])) {
    return data[0];
  }

  return data;
}

async function main() {
  const query = "How do API rate limits work?";

  console.log(`\nQuery: "${query}"`);
  console.log("Generating embedding...\n");

  const embedding = await getEmbedding(query);

  console.log(`Embedding dimensions: ${embedding.length}`);

  if (embedding.length !== 384) {
    throw new Error(
      `Expected 384 dimensions but received ${embedding.length}`
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Searching knowledge base...\n");

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log("No matching chunks found.");
    return;
  }

  console.log("Top matching knowledge chunks:\n");

data.forEach((result: RetrievalResult, index: number) => {
    console.log(`${index + 1}. ${result.title}`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Similarity: ${result.similarity.toFixed(4)}`);
    console.log(`   Chunk: ${result.chunk_text}`);
    console.log("");
  });
}

main().catch((error) => {
  console.error("\n❌ Retrieval test failed:");
  console.error(error);
  process.exit(1);
});