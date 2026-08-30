import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import demoTickets from '../src/data/demo-tickets.json'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const DEMO_CUSTOMER_EMAIL = 'customer@resolveai.demo'

async function seed() {
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_CUSTOMER_EMAIL)
    .single()

  if (customerError || !customer) {
    console.error(
      `Could not find a user with email ${DEMO_CUSTOMER_EMAIL}. Make sure this seeded account exists in both Supabase Auth and the users table before running this script.`
    )
    return
  }

  console.log(`Seeding ${demoTickets.length} demo tickets for ${DEMO_CUSTOMER_EMAIL}...`)

  for (const ticket of demoTickets) {
    const { error } = await supabase.from('tickets').insert({
      customer_id: customer.id,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      resolved_at: ticket.status === 'resolved' ? new Date().toISOString() : null,
    })

    if (error) {
      console.error(`Failed to insert "${ticket.subject}":`, error.message)
    } else {
      console.log(`  ✓ ${ticket.subject}`)
    }
  }

  console.log('\nDone seeding demo tickets.')
}

seed()