import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testRateLimit() {
  for (let i = 1; i <= 12; i++) {
    const response = await fetch('http://localhost:3000/api/generate-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: '00000000-0000-0000-0000-000000000000',
        customerMessage: 'test message',
      }),
    })
    const data = await response.json()
    console.log(`Request ${i}: status ${response.status} — ${data.error || 'ok'}`)
  }
}

testRateLimit()