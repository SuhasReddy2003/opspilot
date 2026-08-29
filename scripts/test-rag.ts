import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testRag() {
  const response = await fetch('http://localhost:3000/api/generate-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: 'b465b00f-e8ff-47e8-a921-d98b4bd9b8ce',
      customerMessage: 'I was charged twice for my subscription this month, can I get a refund?',
    }),
  })

  const data = await response.json()
  console.log(JSON.stringify(data, null, 2))
}

testRag()