import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SavedQuery, GraphQuery } from '@/types/query'
import { SavedQueryManager } from '@/lib/saved-queries'
import { BookmarkIcon, Globe, Lock, Search, Plus, Trash2, Copy } from 'lucide-react'

interface SavedQueriesProps {
  onSelect: (query: SavedQuery) => void
  onSave?: (query: GraphQuery, name: string, description?: string) => void
  currentQuery?: GraphQuery
}

export const SavedQueries: React.FC<SavedQueriesProps> = ({ 
  onSelect,
  onSave,
  currentQuery
}) => {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  
  const queryManager = new SavedQueryManager()

  useEffect(() => {
    loadQueries()
  }, [searchTerm])

  const loadQueries = async () => {
    setIsLoading(true)
    try {
      const results = await queryManager.searchQueries(searchTerm)
      setQueries(results)
    } catch (error) {
      console.error('Failed to load saved queries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentQuery || !saveName.trim()) return
    
    try {
      const saved = await queryManager.saveQuery(
        currentQuery,
        saveName.trim(),
        saveDescription.trim() || undefined
      )
      
      setQueries([saved, ...queries])
      setShowSaveDialog(false)
      setSaveName('')
      setSaveDescription('')
      
      if (onSave) {
        onSave(currentQuery, saveName, saveDescription)
      }
    } catch (error) {
      console.error('Failed to save query:', error)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await queryManager.deleteQuery(id)
      setQueries(queries.filter(q => q.id !== id))
    } catch (error) {
      console.error('Failed to delete query:', error)
    }
  }

  const handleDuplicate = async (query: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const duplicated = await queryManager.duplicateQuery(query.id)
      if (duplicated) {
        setQueries([duplicated, ...queries])
      }
    } catch (error) {
      console.error('Failed to duplicate query:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookmarkIcon className="h-5 w-5" />
              Saved Queries
            </CardTitle>
            <CardDescription>Your saved query templates</CardDescription>
          </div>
          {currentQuery && (
            <Button
              size="sm"
              onClick={() => setShowSaveDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Save Current
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {showSaveDialog && (
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">Save Current Query</h4>
              <Input
                placeholder="Query name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  Save
                </Button>
                <Button 
                  onClick={() => setShowSaveDialog(false)} 
                  variant="outline" 
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading saved queries...
            </div>
          ) : queries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No queries match your search' : 'No saved queries yet'}
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {queries.map((query) => (
                  <div
                    key={query.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelect(query)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{query.name}</h4>
                          {query.isPublic ? (
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {query.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {query.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {query.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Used {query.metadata.useCount} times
                          {query.metadata.lastUsed && (
                            <> • Last used {new Date(query.metadata.lastUsed).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDuplicate(query, e)}
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDelete(query.id, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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