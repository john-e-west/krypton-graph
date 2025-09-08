import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Search, Filter } from 'lucide-react'
import { ParsedQuery, EntityFilter, EdgeFilter, FilterOperator, AttributeFilter } from '@/types/query'

interface QueryBuilderProps {
  onChange: (query: ParsedQuery) => void
  onSubmit: () => void
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onChange, onSubmit }) => {
  const [entityFilters, setEntityFilters] = useState<EntityFilter[]>([])
  const [edgeFilters, setEdgeFilters] = useState<EdgeFilter[]>([])
  const [limit, setLimit] = useState<number>(100)

  const addEntityFilter = () => {
    const newFilter: EntityFilter = {
      type: '',
      attributes: []
    }
    const updated = [...entityFilters, newFilter]
    setEntityFilters(updated)
    updateQuery(updated, edgeFilters)
  }

  const addEdgeFilter = () => {
    const newFilter: EdgeFilter = {
      type: '',
      attributes: []
    }
    const updated = [...edgeFilters, newFilter]
    setEdgeFilters(updated)
    updateQuery(entityFilters, updated)
  }

  const updateEntityFilter = (index: number, filter: EntityFilter) => {
    const updated = [...entityFilters]
    updated[index] = filter
    setEntityFilters(updated)
    updateQuery(updated, edgeFilters)
  }

  const updateEdgeFilter = (index: number, filter: EdgeFilter) => {
    const updated = [...edgeFilters]
    updated[index] = filter
    setEdgeFilters(updated)
    updateQuery(entityFilters, updated)
  }

  const removeEntityFilter = (index: number) => {
    const updated = entityFilters.filter((_, i) => i !== index)
    setEntityFilters(updated)
    updateQuery(updated, edgeFilters)
  }

  const removeEdgeFilter = (index: number) => {
    const updated = edgeFilters.filter((_, i) => i !== index)
    setEdgeFilters(updated)
    updateQuery(entityFilters, updated)
  }

  const updateQuery = (entities: EntityFilter[], edges: EdgeFilter[], newLimit?: number) => {
    const query: ParsedQuery = {
      entities: entities.length > 0 ? entities : undefined,
      edges: edges.length > 0 ? edges : undefined,
      limit: newLimit !== undefined ? newLimit : limit
    }
    onChange(query)
  }

  const addAttributeFilter = (
    filterList: EntityFilter[] | EdgeFilter[],
    filterIndex: number,
    isEntity: boolean
  ) => {
    const newAttribute: AttributeFilter = {
      field: '',
      operator: 'equals',
      value: ''
    }
    
    const filter = filterList[filterIndex]
    const updatedFilter = {
      ...filter,
      attributes: [...(filter.attributes || []), newAttribute]
    }
    
    if (isEntity) {
      updateEntityFilter(filterIndex, updatedFilter as EntityFilter)
    } else {
      updateEdgeFilter(filterIndex, updatedFilter as EdgeFilter)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Entity Filters</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={addEntityFilter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Entity Filter
            </Button>
          </div>
          
          {entityFilters.map((filter, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Entity Type</Label>
                    <Input
                      placeholder="e.g., Person, Document, Project"
                      value={filter.type as string || ''}
                      onChange={(e) => updateEntityFilter(index, { ...filter, type: e.target.value })}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEntityFilter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Attributes</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addAttributeFilter(entityFilters, index, true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {filter.attributes?.map((attr, attrIndex) => (
                    <div key={attrIndex} className="flex gap-2 mt-2">
                      <Input
                        placeholder="Field"
                        value={attr.field}
                        onChange={(e) => {
                          const updated = [...(filter.attributes || [])]
                          updated[attrIndex] = { ...attr, field: e.target.value }
                          updateEntityFilter(index, { ...filter, attributes: updated })
                        }}
                        className="flex-1"
                      />
                      <Select
                        value={attr.operator}
                        onValueChange={(value: FilterOperator) => {
                          const updated = [...(filter.attributes || [])]
                          updated[attrIndex] = { ...attr, operator: value }
                          updateEntityFilter(index, { ...filter, attributes: updated })
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="starts_with">Starts With</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={attr.value}
                        onChange={(e) => {
                          const updated = [...(filter.attributes || [])]
                          updated[attrIndex] = { ...attr, value: e.target.value }
                          updateEntityFilter(index, { ...filter, attributes: updated })
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = filter.attributes?.filter((_, i) => i !== attrIndex)
                          updateEntityFilter(index, { ...filter, attributes: updated })
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Edge Filters</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={addEdgeFilter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Edge Filter
            </Button>
          </div>
          
          {edgeFilters.map((filter, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Edge Type</Label>
                    <Input
                      placeholder="e.g., KNOWS, CREATED_BY, REFERENCES"
                      value={filter.type as string || ''}
                      onChange={(e) => updateEdgeFilter(index, { ...filter, type: e.target.value })}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEdgeFilter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Limit:</Label>
            <Input
              type="number"
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value) || 100
                setLimit(newLimit)
                updateQuery(entityFilters, edgeFilters, newLimit)
              }}
              className="w-24"
            />
          </div>
          
          <Button onClick={onSubmit} className="ml-auto">
            <Search className="h-4 w-4 mr-2" />
            Execute Query
          </Button>
        </div>
      </div>
    </div>
  )
}