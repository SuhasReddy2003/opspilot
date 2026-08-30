import { describe, it, expect } from 'vitest'
import { chunkText } from '../src/lib/rag-utils'

describe('chunkText', () => {
  it('groups sentences into chunks of the specified size', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.'
    const chunks = chunkText(text, 2)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toBe('First sentence. Second sentence.')
    expect(chunks[1]).toBe('Third sentence. Fourth sentence.')
  })

  it('handles an odd number of sentences without dropping the last one', () => {
    const text = 'One. Two. Three.'
    const chunks = chunkText(text, 2)
    expect(chunks).toHaveLength(2)
    expect(chunks[1]).toBe('Three.')
  })

  it('returns an empty array for empty input', () => {
    expect(chunkText('', 2)).toEqual([])
  })

  it('handles a single sentence', () => {
    const chunks = chunkText('Just one sentence.', 2)
    expect(chunks).toEqual(['Just one sentence.'])
  })

  it('respects a custom chunk size', () => {
    const text = 'A. B. C. D. E. F.'
    const chunks = chunkText(text, 3)
    expect(chunks).toHaveLength(2)
  })
})