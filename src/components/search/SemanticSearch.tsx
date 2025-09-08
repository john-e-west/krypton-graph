import React, { useState, useCallback, useEffect } from 'react'
import { Search, Sparkles, Loader2, Filter, History, BookOpen, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'entity' | 'edge' | 'document' | 'concept'
  title: string
  description: string
  relevanceScore: number
  highlights: string[]
  metadata: {
    graph?: string
    timestamp?: Date
    source?: string
    tags?: string[]
  }
}

interface SemanticSearchProps {
  graphId?: string
  onResultSelect?: (result: SearchResult) => void
  className?: string
}

export function SemanticSearch({ graphId, onResultSelect, className }: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('results')
  const [searchMode, setSearchMode] = useState<'semantic' | 'hybrid' | 'exact'>('semantic')

  // Simulated search with mock data
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    // Mock results based on query
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'entity',
        title: 'Knowledge Graph Architecture',
        description: 'Core architectural patterns and design principles for distributed knowledge graph systems.',
        relevanceScore: 0.95,
        highlights: [
          'The <mark>knowledge graph</mark> uses a distributed architecture...',
          'Semantic relationships are processed using <mark>natural language</mark> understanding...'
        ],
        metadata: {
          graph: 'System Architecture',
          timestamp: new Date(),
          tags: ['architecture', 'system-design', 'distributed']
        }
      },
      {
        id: '2',
        type: 'document',
        title: 'Graph Query Optimization Techniques',
        description: 'Advanced techniques for optimizing complex graph traversal queries.',
        relevanceScore: 0.89,
        highlights: [
          'Query optimization involves <mark>semantic analysis</mark> of the graph structure...',
          'Performance improvements of up to 10x using <mark>intelligent caching</mark>...'
        ],
        metadata: {
          graph: 'Technical Documentation',
          source: 'docs/optimization.md',
          tags: ['performance', 'optimization', 'queries']
        }
      },
      {
        id: '3',
        type: 'concept',
        title: 'Temporal Relationships in Knowledge Graphs',
        description: 'Modeling and querying time-based relationships and entity evolution.',
        relevanceScore: 0.82,
        highlights: [
          'Temporal <mark>knowledge graphs</mark> capture entity state changes over time...',
          'Bi-temporal modeling supports both valid time and transaction time...'
        ],
        metadata: {
          graph: 'Research Papers',
          timestamp: new Date(),
          tags: ['temporal', 'relationships', 'modeling']
        }
      },
      {
        id: '4',
        type: 'edge',
        title: 'Entity Relationship: User → Document',
        description: 'Defines the interaction patterns between users and documents in the system.',
        relevanceScore: 0.76,
        highlights: [
          'Users can <mark>create, modify, and query</mark> documents...',
          'Permission-based access control for <mark>sensitive information</mark>...'
        ],
        metadata: {
          graph: 'System Ontology',
          tags: ['relationships', 'permissions', 'users']
        }
      }
    ]

    setResults(mockResults)
    setIsSearching(false)

    // Add to search history
    setSearchHistory(prev => {
      const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)]
      return updated.slice(0, 10) // Keep last 10 searches
    })
  }, [])

  // Auto-search on query change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        performSearch(query)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleHistorySelect = (historicalQuery: string) => {
    setQuery(historicalQuery)
    performSearch(historicalQuery)
  }

  const suggestedQueries = [
    "Show me all entities related to machine learning",
    "Find temporal relationships in the last 30 days",
    "What documents mention graph optimization?",
    "List all user permissions and access patterns"
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Semantic Search
          </h2>
          <Badge variant="secondary" className="ml-2">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Ask anything about your knowledge graph..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-32 h-12 text-lg border-2 focus:border-primary transition-colors"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-md bg-background"
            >
              <option value="semantic">Semantic</option>
              <option value="hybrid">Hybrid</option>
              <option value="exact">Exact</option>
            </select>
            <Button
              size="sm"
              onClick={() => performSearch(query)}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>

        {/* Suggested Queries */}
        {!query && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {suggestedQueries.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setQuery(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">
            Results {results.length > 0 && `(${results.length})`}
          </TabsTrigger>
          <TabsTrigger value="filters">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Searching across knowledge graphs...</span>
            </div>
          ) : results.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                    onClick={() => onResultSelect?.(result)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              result.type === 'entity' ? 'default' :
                              result.type === 'document' ? 'secondary' :
                              result.type === 'concept' ? 'outline' : 'destructive'
                            }>
                              {result.type}
                            </Badge>
                            <CardTitle className="text-lg">{result.title}</CardTitle>
                          </div>
                          <CardDescription>{result.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {Math.round(result.relevanceScore * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">relevance</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.highlights.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {result.highlights.map((highlight, idx) => (
                            <p
                              key={idx}
                              className="text-sm text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: highlight }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {result.metadata.graph && (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {result.metadata.graph}
                          </Badge>
                        )}
                        {result.metadata.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : query ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Enter a search query to explore your knowledge graph
            </div>
          )}
        </TabsContent>

        <TabsContent value="filters" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
              <CardDescription>Refine your search results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Entity Types</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Entity', 'Document', 'Concept', 'Edge'].map((type) => (
                    <Badge key={type} variant="outline" className="cursor-pointer hover:bg-primary/10">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium">Time Range</label>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm">Last 24h</Button>
                  <Button variant="outline" size="sm">Last Week</Button>
                  <Button variant="outline" size="sm">Last Month</Button>
                  <Button variant="outline" size="sm">All Time</Button>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium">Relevance Threshold</label>
                <div className="flex items-center gap-2 mt-2">
                  <input type="range" min="0" max="100" defaultValue="50" className="flex-1" />
                  <span className="text-sm text-muted-foreground">50%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search History</CardTitle>
              <CardDescription>Your recent searches</CardDescription>
            </CardHeader>
            <CardContent>
              {searchHistory.length > 0 ? (
                <div className="space-y-2">
                  {searchHistory.map((historyItem, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleHistorySelect(historyItem)}
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{historyItem}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        Search Again
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No search history yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}