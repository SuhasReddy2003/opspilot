export function chunkText(text: string, maxSentencesPerChunk: number = 2): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const chunks: string[] = []

  for (let i = 0; i < sentences.length; i += maxSentencesPerChunk) {
    const chunk = sentences.slice(i, i + maxSentencesPerChunk).join(' ').trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
  }
  return chunks
}

export function detectCategory(text: string): string | null {
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