import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NaturalLanguageParser } from '../query-parser'
import { ParsedQuery } from '@/types/query'

describe('NaturalLanguageParser', () => {
  let parser: NaturalLanguageParser
  
  beforeEach(() => {
    parser = new NaturalLanguageParser('test-api-key')
  })

  describe('fallback parser', () => {
    it('parses entity type mentions', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'))
      
      const result = await parser.parseNaturalLanguage('Find all Person entities')
      
      expect(result.entities).toBeDefined()
      expect(result.entities).toHaveLength(1)
      expect(result.entities![0].type).toBe('Person')
    })

    it('parses multiple entity types', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'))
      
      const result = await parser.parseNaturalLanguage('Show Person and Document records')
      
      expect(result.entities).toBeDefined()
      expect(result.entities).toHaveLength(2)
      expect(result.entities!.map(e => e.type)).toContain('Person')
      expect(result.entities!.map(e => e.type)).toContain('Document')
    })

    it('parses limit keywords', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'))
      
      const result = await parser.parseNaturalLanguage('Find top 50 documents')
      
      expect(result.limit).toBe(50)
      expect(result.entities).toHaveLength(1)
      expect(result.entities![0].type).toBe('Document')
    })

    it('parses edge type mentions', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'))
      
      const result = await parser.parseNaturalLanguage('Find created by relationships')
      
      expect(result.edges).toBeDefined()
      expect(result.edges).toHaveLength(1)
      expect(result.edges![0].type).toBe('CREATED_BY')
    })
  })

  describe('OpenAI integration', () => {
    it('sends correct prompt to OpenAI', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                entities: [{ type: 'Person' }],
                edges: [],
                limit: 100
              })
            }
          }]
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      const result = await parser.parseNaturalLanguage('Find all people')
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      )
      
      expect(result.entities).toHaveLength(1)
      expect(result.entities![0].type).toBe('Person')
    })

    it('validates and enhances parsed results', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                entities: [
                  { type: 'Person' },
                  { type: 'InvalidType' }
                ],
                edges: [],
                limit: 50
              })
            }
          }]
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      const result = await parser.parseNaturalLanguage('Find people and invalid')
      
      expect(result.entities).toHaveLength(1)
      expect(result.entities![0].type).toBe('Person')
      expect(result.limit).toBe(50)
    })
  })

  describe('suggestions', () => {
    it('provides entity type suggestions', async () => {
      const suggestions = await parser.getSuggestions('per', {
        expecting: 'entity_type'
      })
      
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'entity_type',
          value: 'Person',
          label: 'Person'
        })
      )
    })

    it('provides attribute suggestions for entity type', async () => {
      const suggestions = await parser.getSuggestions('nam', {
        expecting: 'attribute',
        entityType: 'Person'
      })
      
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'attribute',
          value: 'name',
          label: 'name'
        })
      )
    })

    it('provides template suggestions', async () => {
      const suggestions = await parser.getSuggestions('find', {
        expecting: 'entity_type'
      })
      
      expect(suggestions.some(s => s.type === 'template')).toBe(true)
    })

    it('provides historical suggestions', async () => {
      const suggestions = await parser.getSuggestions('document', {
        expecting: 'entity_type'
      })
      
      expect(suggestions.some(s => s.type === 'historical')).toBe(true)
    })
  })

  describe('query suggestions', () => {
    it('suggests queries based on partial input', async () => {
      const suggestions = await parser.suggestQueries('doc')
      
      expect(suggestions).toContain('Find all Documents')
      expect(suggestions).toContain('Show recent Documents')
    })

    it('includes historical queries in suggestions', async () => {
      const suggestions = await parser.suggestQueries('created')
      
      expect(suggestions).toContain('Find all documents created this week')
    })

    it('limits suggestions to 10', async () => {
      const suggestions = await parser.suggestQueries('')
      
      expect(suggestions.length).toBeLessThanOrEqual(10)
    })
  })
})