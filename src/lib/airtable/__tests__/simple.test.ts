// Simple working test to verify our setup
import { describe, it, expect } from 'vitest'
import { RateLimitError, ValidationError, AirtableApiError } from '../../types/airtable'

describe('Airtable Types', () => {
  it('should create RateLimitError', () => {
    const error = new RateLimitError('Rate limit exceeded')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('RateLimitError')
    expect(error.message).toBe('Rate limit exceeded')
    expect(error.statusCode).toBe(429)
  })

  it('should create ValidationError', () => {
    const error = new ValidationError('Validation failed', 'name')
    expect(error).toBeInstanceOf(AirtableApiError)
    expect(error.name).toBe('ValidationError')
    expect(error.field).toBe('name')
  })

  it('should create AirtableApiError', () => {
    const error = new AirtableApiError('API error', 500, 'SERVER_ERROR')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AirtableApiError')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('SERVER_ERROR')
  })
})