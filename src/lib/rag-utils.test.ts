import { describe, it, expect } from 'vitest'
import { detectCategory } from './rag-utils'

describe('detectCategory', () => {
  it('detects Billing for refund/payment related questions', () => {
    expect(detectCategory('I was charged twice, can I get a refund?')).toBe('Billing')
    expect(detectCategory('My subscription payment failed')).toBe('Billing')
  })

  it('detects API for technical/error related questions', () => {
    expect(detectCategory('I am getting a 429 error from the API')).toBe('API')
    expect(detectCategory('How do I authenticate with the webhook?')).toBe('API')
  })

  it('detects Product for team/account related questions', () => {
    expect(detectCategory('How do I add a new team member?')).toBe('Product')
    expect(detectCategory('Can an admin change permissions?')).toBe('Product')
  })

  it('returns null when there is no clear category signal', () => {
    expect(detectCategory('testing the app')).toBeNull()
    expect(detectCategory('hello')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(detectCategory('I NEED A REFUND NOW')).toBe('Billing')
  })
})