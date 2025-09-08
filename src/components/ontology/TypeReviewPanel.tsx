'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Grip, Edit2, Check, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AttributeDefinition {
  name: string
  type: string
  required: boolean
  description?: string
}

interface EntityType {
  id: string
  name: string
  description: string
  expectedCount: number
  confidence: number
  examples: string[]
  attributes: AttributeDefinition[]
}

interface EdgeType {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  confidence: number
  examples: string[]
}

interface TypeReviewPanelProps {
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  onTypeEdit?: (typeId: string, type: 'entity' | 'edge') => void
  onTypeDelete?: (typeId: string, type: 'entity' | 'edge') => void
  onTypeUpdate?: (typeId: string, updates: Partial<EntityType | EdgeType>, type: 'entity' | 'edge') => void
  onTypeReorder?: (types: EntityType[] | EdgeType[], type: 'entity' | 'edge') => void
  className?: string
}

export function TypeReviewPanel({
  entityTypes,
  edgeTypes,
  onTypeEdit,
  onTypeDelete,
  onTypeUpdate,
  onTypeReorder,
  className
}: TypeReviewPanelProps) {
  const [expandedTypes, setExpandedTypes] = React.useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = React.useState<string | null>(null)
  const [editingType, setEditingType] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState<{ name: string; description: string }>({ name: '', description: '' })
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ id: string; type: 'entity' | 'edge' } | null>(null)

  const toggleExpanded = (typeId: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId)
    } else {
      newExpanded.add(typeId)
    }
    setExpandedTypes(newExpanded)
  }

  const startEditing = (id: string, name: string, description: string) => {
    setEditingType(id)
    setEditValues({ name, description })
  }

  const saveEdit = (id: string, type: 'entity' | 'edge') => {
    if (onTypeUpdate) {
      onTypeUpdate(id, editValues, type)
    }
    setEditingType(null)
  }

  const cancelEdit = () => {
    setEditingType(null)
    setEditValues({ name: '', description: '' })
  }

  const handleDelete = (id: string, type: 'entity' | 'edge') => {
    setDeleteConfirm({ id, type })
  }

  const confirmDelete = () => {
    if (deleteConfirm && onTypeDelete) {
      onTypeDelete(deleteConfirm.id, deleteConfirm.type)
    }
    setDeleteConfirm(null)
  }

  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "destructive" | "outline" => {
    if (confidence >= 0.8) return "default"
    if (confidence >= 0.6) return "secondary"
    if (confidence >= 0.4) return "outline"
    return "destructive"
  }

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return "High"
    if (confidence >= 0.6) return "Medium"
    if (confidence >= 0.4) return "Low"
    return "Very Low"
  }

  const handleDragStart = (e: React.DragEvent, typeId: string) => {
    setIsDragging(typeId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', typeId)
  }

  const handleDragEnd = () => {
    setIsDragging(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string, isEntity: boolean) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    
    if (sourceId === targetId) return

    if (isEntity && onTypeReorder) {
      const sourceIndex = entityTypes.findIndex(t => t.id === sourceId)
      const targetIndex = entityTypes.findIndex(t => t.id === targetId)
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newTypes = [...entityTypes]
        const [removed] = newTypes.splice(sourceIndex, 1)
        newTypes.splice(targetIndex, 0, removed)
        onTypeReorder(newTypes, 'entity')
      }
    } else if (!isEntity && onTypeReorder) {
      const sourceIndex = edgeTypes.findIndex(t => t.id === sourceId)
      const targetIndex = edgeTypes.findIndex(t => t.id === targetId)
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newTypes = [...edgeTypes]
        const [removed] = newTypes.splice(sourceIndex, 1)
        newTypes.splice(targetIndex, 0, removed)
        onTypeReorder(newTypes, 'edge')
      }
    }
  }

  const renderEntityType = (entity: EntityType) => {
    const isExpanded = expandedTypes.has(entity.id)
    
    return (
      <Card
        key={entity.id}
        className={cn(
          "mb-3 transition-opacity",
          isDragging === entity.id && "opacity-50"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, entity.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, entity.id, true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Grip className="h-4 w-4 text-muted-foreground cursor-move" />
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(entity.id)}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <div>
                    {editingType === entity.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          className="h-7 text-base font-semibold"
                        />
                        <Textarea
                          value={editValues.description}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          className="text-sm"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-base">{entity.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {entity.description}
                        </CardDescription>
                      </>
                    )}
                  </div>
                </div>
              </Collapsible>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getConfidenceBadgeVariant(entity.confidence)}>
                {getConfidenceLabel(entity.confidence)} ({Math.round(entity.confidence * 100)}%)
              </Badge>
              <Badge variant="outline">
                ~{entity.expectedCount} items
              </Badge>
              {editingType === entity.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveEdit(entity.id, 'entity')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(entity.id, entity.name, entity.description)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {onTypeEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTypeEdit(entity.id, 'entity')}
                    >
                      Edit
                    </Button>
                  )}
                  {onTypeDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entity.id, 'entity')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {entity.examples.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Examples</h4>
                  <div className="space-y-1">
                    {entity.examples.slice(0, 3).map((example, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {entity.attributes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Attributes</h4>
                  <div className="space-y-1">
                    {entity.attributes.map((attr, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-mono">{attr.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {attr.type}
                        </Badge>
                        {attr.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  const renderEdgeType = (edge: EdgeType) => {
    const isExpanded = expandedTypes.has(edge.id)
    
    return (
      <Card
        key={edge.id}
        className={cn(
          "mb-3 transition-opacity",
          isDragging === edge.id && "opacity-50"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, edge.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, edge.id, false)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Grip className="h-4 w-4 text-muted-foreground cursor-move" />
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(edge.id)}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <div>
                    {editingType === edge.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          className="h-7 text-base font-semibold"
                        />
                        <Textarea
                          value={editValues.description}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          className="text-sm"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-base">{edge.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {edge.description}
                        </CardDescription>
                      </>
                    )}
                  </div>
                </div>
              </Collapsible>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getConfidenceBadgeVariant(edge.confidence)}>
                {getConfidenceLabel(edge.confidence)} ({Math.round(edge.confidence * 100)}%)
              </Badge>
              {editingType === edge.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveEdit(edge.id, 'edge')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(edge.id, edge.name, edge.description)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {onTypeEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTypeEdit(edge.id, 'edge')}
                    >
                      Edit
                    </Button>
                  )}
                  {onTypeDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(edge.id, 'edge')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Relationships</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    From: {edge.sourceTypes.join(', ')}
                  </Badge>
                  <span>→</span>
                  <Badge variant="outline">
                    To: {edge.targetTypes.join(', ')}
                  </Badge>
                </div>
              </div>
              
              {edge.examples.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Examples</h4>
                  <div className="space-y-1">
                    {edge.examples.slice(0, 3).map((example, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  return (
    <>
      <div className={cn("space-y-6", className)}>
        <div>
          <h3 className="text-lg font-semibold mb-3">Entity Types</h3>
          <ScrollArea className="h-[400px] pr-4">
            {entityTypes.map(renderEntityType)}
          </ScrollArea>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">Edge Types</h3>
          <ScrollArea className="h-[400px] pr-4">
            {edgeTypes.map(renderEdgeType)}
          </ScrollArea>
        </div>
      </div>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this type? This action cannot be undone.
              Items currently classified with this type will become unclassified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}