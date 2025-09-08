import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GraphQuery } from '@/types/query'
import { QueryHistoryManager, QueryHistoryEntry } from '@/lib/query-history'
import { Clock, Sparkles, Code2, Search, RotateCcw, Trash2, TrendingUp } from 'lucide-react'

interface QueryHistoryProps {
  onSelect: (query: GraphQuery) => void
  onRerun?: (query: GraphQuery) => void
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({ onSelect, onRerun }) => {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)
  
  const historyManager = new QueryHistoryManager()

  useEffect(() => {
    loadHistory()
  }, [searchTerm])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const results = searchTerm 
        ? await historyManager.searchHistory(searchTerm)
        : await historyManager.getHistory(50)
      setHistory(results)
    } catch (error) {
      console.error('Failed to load query history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await historyManager.deleteHistoryEntry(id)
      setHistory(history.filter(h => h.id !== id))
    } catch (error) {
      console.error('Failed to delete history entry:', error)
    }
  }

  const handleRerun = async (entry: QueryHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (onRerun) {
      onRerun(entry.query)
    }
  }

  const formatQuery = (query: GraphQuery) => {
    if (query.type === 'natural') {
      return query.raw
    }
    try {
      const parsed = typeof query.raw === 'string' ? JSON.parse(query.raw) : query.raw
      if (parsed.entities?.length) {
        return `Find ${parsed.entities[0].type || 'entities'}`
      }
      if (parsed.edges?.length) {
        return `Find ${parsed.edges[0].type || 'relationships'}`
      }
      return 'Custom query'
    } catch {
      return 'Custom query'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'cancelled': return 'text-yellow-600'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Query History
            </CardTitle>
            <CardDescription>Your recent searches</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStats(!showStats)}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Stats
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search query history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading query history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No queries match your search' : 'No query history yet'}
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelect(entry.query)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {entry.query.type === 'natural' ? (
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {formatQuery(entry.query)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(entry.status)}`}
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleRerun(entry, e)}
                          title="Rerun query"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDelete(entry.id, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      {entry.executionTime && (
                        <>
                          <span>•</span>
                          <span>{entry.executionTime}ms</span>
                        </>
                      )}
                      {entry.result?.metadata.totalResults !== undefined && (
                        <>
                          <span>•</span>
                          <span>{entry.result.metadata.totalResults} results</span>
                        </>
                      )}
                      {entry.error && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 truncate">{entry.error}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}