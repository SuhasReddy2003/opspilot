import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { subject, description } = await req.json()

    if (!subject || !description) {
      return NextResponse.json({ error: 'Missing subject or description' }, { status: 400 })
    }

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `You are a support ticket classifier for NovaDesk. Given a ticket subject and description, respond with ONLY a JSON object, no other text, in this exact format:
{"priority": "low" | "medium" | "high", "category": "Billing" | "API" | "Product" | "Other"}

Priority guidance:
- "high": account access blocked, payment/security issue, production API failures, data loss risk
- "medium": functional problems affecting workflow but not blocking, billing questions
- "low": general questions, feature requests, minor cosmetic issues

Category guidance: Billing = payments/refunds/invoices/subscriptions. API = integration/errors/webhooks/rate limits. Product = team/permissions/account setup/integrations with other tools. Other = anything that doesn't clearly fit.`,
        },
        {
          role: 'user',
          content: `Subject: ${subject}\nDescription: ${description}`,
        },
      ],
    })

    const raw = completion.choices[0].message.content || '{}'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const validPriorities = ['low', 'medium', 'high']
    const validCategories = ['Billing', 'API', 'Product', 'Other']

    const priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'medium'
    const category = validCategories.includes(parsed.category) ? parsed.category : 'Other'

    return NextResponse.json({ priority, category })
  } catch (err) {
    console.error('Classification error:', err)
    // Fail safe: default to medium/Other rather than blocking ticket creation
    return NextResponse.json({ priority: 'medium', category: 'Other' })
  }
}