'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  EyeOff, 
  GroupIcon,
  Target,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UnclassifiedItem {
  id: string
  text: string
  context: string
  score?: number
  suggestedTypes?: Array<{
    typeName: string
    confidence: number
  }>
  pattern?: string
  selected?: boolean
}

interface ItemPattern {
  pattern: string
  regex: string
  count: number
  examples: string[]
  suggestedTypeName?: string
}

interface UnclassifiedItemsPanelProps {
  items: UnclassifiedItem[]
  patterns?: ItemPattern[]
  availableTypes?: string[]
  onCreateType?: (items: UnclassifiedItem[], pattern?: ItemPattern) => void
  onAssignToType?: (items: UnclassifiedItem[], typeName: string) => void
  onMarkAsIgnored?: (items: UnclassifiedItem[]) => void
  onSelectionChange?: (selectedItems: UnclassifiedItem[]) => void
  className?: string
}

const highlightText = (text: string, search: string) => {
  if (!search.trim()) return text
  
  const regex = new RegExp(`(${search})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
    ) : part
  )
}

export function UnclassifiedItemsPanel({
  items,
  patterns = [],
  availableTypes = [],
  onCreateType,
  onAssignToType,
  onMarkAsIgnored,
  onSelectionChange,
  className
}: UnclassifiedItemsPanelProps) {
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterBy, setFilterBy] = React.useState<'all' | 'no-suggestions' | 'with-suggestions'>('all')
  const [showPatterns, setShowPatterns] = React.useState(false)
  const [selectedPattern, setSelectedPattern] = React.useState<string | null>(null)

  const filteredItems = React.useMemo(() => {
    let filtered = items

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.text.toLowerCase().includes(searchLower) ||
        item.context?.toLowerCase().includes(searchLower)
      )
    }

    // Apply suggestion filter
    if (filterBy === 'no-suggestions') {
      filtered = filtered.filter(item => !item.suggestedTypes || item.suggestedTypes.length === 0)
    } else if (filterBy === 'with-suggestions') {
      filtered = filtered.filter(item => item.suggestedTypes && item.suggestedTypes.length > 0)
    }

    return filtered
  }, [items, searchTerm, filterBy])

  const selectedItemsArray = React.useMemo(() => 
    items.filter(item => selectedItems.has(item.id)), 
    [items, selectedItems]
  )

  React.useEffect(() => {
    onSelectionChange?.(selectedItemsArray)
  }, [selectedItemsArray, onSelectionChange])

  const handleItemSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    }
  }

  const handlePatternSelect = (pattern: ItemPattern) => {
    const patternItems = items.filter(item => {
      try {
        const regex = new RegExp(pattern.regex, 'i')
        return regex.test(item.text)
      } catch {
        return false
      }
    })
    setSelectedItems(new Set(patternItems.map(item => item.id)))
    setSelectedPattern(pattern.pattern)
  }

  const handleCreateType = () => {
    if (selectedItemsArray.length > 0) {
      const pattern = selectedPattern ? patterns.find(p => p.pattern === selectedPattern) : undefined
      onCreateType?.(selectedItemsArray, pattern)
    }
  }

  const handleAssignToType = (typeName: string) => {
    if (selectedItemsArray.length > 0) {
      onAssignToType?.(selectedItemsArray, typeName)
      setSelectedItems(new Set())
    }
  }

  const handleMarkAsIgnored = () => {
    if (selectedItemsArray.length > 0) {
      onMarkAsIgnored?.(selectedItemsArray)
      setSelectedItems(new Set())
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Unclassified Items ({items.length})
            </CardTitle>
            <CardDescription>
              Items that don't match any current type definitions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPatterns(!showPatterns)}
          >
            {showPatterns ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPatterns ? 'Hide' : 'Show'} Patterns
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="with-suggestions">With suggestions</SelectItem>
              <SelectItem value="no-suggestions">No suggestions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showPatterns && patterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detected Patterns</h4>
            <div className="grid gap-2">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {pattern.pattern}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pattern.count} items match this pattern
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pattern.suggestedTypeName && (
                        <Badge variant="outline">{pattern.suggestedTypeName}</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePatternSelect(pattern)}
                      >
                        <GroupIcon className="h-4 w-4" />
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedItems.size > 0 && selectedItems.size === filteredItems.length}
              onCheckedChange={handleSelectAll}
              indeterminate={selectedItems.size > 0 && selectedItems.size < filteredItems.length}
            />
            <span className="text-sm">
              {selectedItems.size} of {filteredItems.length} selected
            </span>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="flex gap-2">
              <Select onValueChange={handleAssignToType}>
                <SelectTrigger className="w-40">
                  <Target className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Assign to type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateType} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Type
              </Button>
              <Button 
                onClick={handleMarkAsIgnored} 
                variant="outline" 
                size="sm"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Ignore
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-96 border rounded">
          {filteredItems.length > 0 ? (
            <div className="space-y-2 p-2">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "border rounded-lg p-3 space-y-2",
                    selectedItems.has(item.id) && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => handleItemSelect(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-medium">
                        {highlightText(item.text, searchTerm)}
                      </div>
                      
                      {item.context && (
                        <div className="text-xs text-muted-foreground">
                          Context: {highlightText(item.context, searchTerm)}
                        </div>
                      )}
                      
                      {item.suggestedTypes && item.suggestedTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.suggestedTypes.map((suggestion, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {suggestion.typeName} ({Math.round(suggestion.confidence * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              {items.length === 0 ? 
                "No unclassified items found" : 
                "No items match current filters"
              }
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}