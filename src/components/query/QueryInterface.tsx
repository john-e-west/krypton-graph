import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Sparkles, Code2 } from 'lucide-react'
import { GraphQuery, ParsedQuery, QueryResult, SavedQuery } from '@/types/query'
import { QueryBuilder } from './QueryBuilder'
import { QueryAutocomplete } from './QueryAutocomplete'
import { ResultVisualizer } from './ResultVisualizer'
import { SavedQueries } from './SavedQueries'
import { QueryHistory } from './QueryHistory'
import { NaturalLanguageParser } from '@/lib/query-parser'
import { QueryExecutor } from '@/lib/query-executor'
import { QueryHistoryManager } from '@/lib/query-history'

interface QueryInterfaceProps {
  openaiApiKey?: string
  airtableApiKey?: string
  airtableBaseId?: string
}

export const QueryInterface: React.FC<QueryInterfaceProps> = ({
  openaiApiKey,
  airtableApiKey,
  airtableBaseId
}) => {
  const [queryType, setQueryType] = useState<'natural' | 'structured'>('natural')
  const [naturalQuery, setNaturalQuery] = useState('')
  const [structuredQuery, setStructuredQuery] = useState<ParsedQuery | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<GraphQuery | null>(null)
  
  // Initialize services
  const parser = openaiApiKey ? new NaturalLanguageParser(openaiApiKey) : null
  const executor = airtableApiKey && airtableBaseId 
    ? new QueryExecutor(airtableBaseId, airtableApiKey) 
    : null
  const historyManager = new QueryHistoryManager()

  const executeQuery = async (query: GraphQuery) => {
    if (!executor) {
      setError('Query execution not available - missing configuration')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let parsedQuery = query.parsed
      
      if (query.type === 'natural' && parser) {
        parsedQuery = await parser.parseNaturalLanguage(query.raw)
      }

      const result = await executor.execute(parsedQuery)
      setQueryResult(result)
      
      await historyManager.addToHistory(query, result, 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query execution failed'
      setError(errorMessage)
      await historyManager.addToHistory(query, undefined, 'error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNaturalQuerySubmit = async () => {
    if (!naturalQuery.trim()) return

    const query: GraphQuery = {
      id: `q_${Date.now()}`,
      type: 'natural',
      raw: naturalQuery,
      parsed: {} as ParsedQuery,
      metadata: {
        createdAt: new Date(),
        createdBy: 'current_user'
      }
    }

    setCurrentQuery(query)
    await executeQuery(query)
  }

  const handleStructuredQuerySubmit = async () => {
    if (!structuredQuery) return

    const query: GraphQuery = {
      id: `q_${Date.now()}`,
      type: 'structured',
      raw: JSON.stringify(structuredQuery),
      parsed: structuredQuery,
      metadata: {
        createdAt: new Date(),
        createdBy: 'current_user'
      }
    }

    setCurrentQuery(query)
    await executeQuery(query)
  }

  const handleQuerySelect = (savedQuery: SavedQuery) => {
    const query = savedQuery.query
    setCurrentQuery(query)
    
    if (query.type === 'natural') {
      setNaturalQuery(query.raw)
      setQueryType('natural')
    } else {
      setStructuredQuery(query.parsed)
      setQueryType('structured')
    }
  }

  const handleQueryRerun = async (query: GraphQuery) => {
    setCurrentQuery(query)
    
    if (query.type === 'natural') {
      setNaturalQuery(query.raw)
      setQueryType('natural')
    } else {
      setStructuredQuery(query.parsed)
      setQueryType('structured')
    }
    
    await executeQuery(query)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Graph Query Interface</CardTitle>
          <CardDescription>
            Search your knowledge graph using natural language or structured queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={queryType} onValueChange={(v) => setQueryType(v as 'natural' | 'structured')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="natural" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Natural Language
              </TabsTrigger>
              <TabsTrigger value="structured" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Query Builder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="natural" className="space-y-4">
              <div className="relative">
                <QueryAutocomplete
                  value={naturalQuery}
                  onChange={setNaturalQuery}
                  onSelect={(suggestion) => setNaturalQuery(suggestion.value)}
                  placeholder="Ask a question about your knowledge graph..."
                />
                <Button
                  onClick={handleNaturalQuerySubmit}
                  disabled={!naturalQuery.trim() || isLoading}
                  className="mt-2"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="structured" className="space-y-4">
              <QueryBuilder
                onChange={setStructuredQuery}
                onSubmit={handleStructuredQuerySubmit}
              />
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

        </CardContent>
      </Card>

      {queryResult && (
        <ResultVisualizer result={queryResult} />
      )}

      <div className="grid grid-cols-2 gap-6">
        <SavedQueries
          onSelect={handleQuerySelect}
          currentQuery={currentQuery}
        />
        <QueryHistory
          onSelect={(query) => {
            if (query.type === 'natural') {
              setNaturalQuery(query.raw)
              setQueryType('natural')
            } else {
              setStructuredQuery(query.parsed)
              setQueryType('structured')
            }
            setCurrentQuery(query)
          }}
          onRerun={handleQueryRerun}
        />
      </div>
    </div>
  )
}