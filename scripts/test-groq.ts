import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function testGroq() {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      { role: 'user', content: 'Say hello and confirm you are working, in one sentence.' },
    ],
  })

  console.log(completion.choices[0].message.content)
}

testGroq()