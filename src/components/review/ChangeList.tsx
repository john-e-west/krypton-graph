import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Change, Annotation } from '../../types/review'
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Plus, Edit, Trash } from 'lucide-react'

interface ChangeListProps {
  changes: Change[]
  selectedChanges: Set<string>
  onSelectChange: (changeId: string, selected: boolean) => void
  annotations: Map<string, Annotation[]>
  onAnnotate?: (changeId: string, annotation: Annotation) => void
}

export function ChangeList({
  changes,
  selectedChanges,
  onSelectChange,
  annotations,
  onAnnotate
}: ChangeListProps) {
  const getChangeIcon = (type: Change['type']) => {
    if (type.startsWith('CREATE')) return <Plus className="h-4 w-4 text-green-500" />
    if (type.startsWith('UPDATE')) return <Edit className="h-4 w-4 text-blue-500" />
    if (type.startsWith('DELETE')) return <Trash className="h-4 w-4 text-red-500" />
    return null
  }

  const getChangeTypeLabel = (type: Change['type']) => {
    const labels: Record<Change['type'], string> = {
      'CREATE': 'Create',
      'UPDATE': 'Update',
      'DELETE': 'Delete',
      'CREATE_ENTITY': 'Create Entity',
      'CREATE_EDGE': 'Create Edge',
      'UPDATE_ENTITY': 'Update Entity',
      'UPDATE_EDGE': 'Update Edge',
      'DELETE_ENTITY': 'Delete Entity',
      'DELETE_EDGE': 'Delete Edge'
    }
    return labels[type] || type
  }

  const getImpactBadgeVariant = (severity?: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'secondary'
      case 'medium': return 'outline'
      case 'high': return 'destructive'
      default: return 'secondary'
    }
  }

  const groupedChanges = changes.reduce((acc, change) => {
    const category = change.type.split('_')[0]
    if (!acc[category]) acc[category] = []
    acc[category].push(change)
    return acc
  }, {} as Record<string, Change[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groupedChanges).map(([category, categoryChanges]) => (
        <div key={category} className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            {category} Operations
            <Badge variant="secondary">{categoryChanges.length}</Badge>
          </h3>
          
          <Accordion type="single" collapsible className="space-y-2">
            {categoryChanges.map((change, index) => (
              <AccordionItem key={change.id} value={change.id} className="border rounded">
                <div className="flex items-start gap-3 p-3">
                  <Checkbox
                    checked={selectedChanges.has(change.id)}
                    onCheckedChange={(checked) => onSelectChange(change.id, !!checked)}
                    className="mt-1"
                  />
                  
                  <div className="flex-grow">
                    <AccordionTrigger className="hover:no-underline p-0">
                      <div className="flex items-center gap-2 text-left">
                        {getChangeIcon(change.type)}
                        <span className="font-medium">{getChangeTypeLabel(change.type)}</span>
                        {change.entityId && (
                          <span className="text-sm text-muted-foreground">
                            Entity: {change.entityId}
                          </span>
                        )}
                        {change.edgeId && (
                          <span className="text-sm text-muted-foreground">
                            Edge: {change.edgeId}
                          </span>
                        )}
                        {change.impact && (
                          <Badge variant={getImpactBadgeVariant(change.impact.severity)}>
                            Impact: {change.impact.severity}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-4">
                      <div className="space-y-3">
                        {change.impact?.description && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            <p className="text-sm">{change.impact.description}</p>
                          </div>
                        )}
                        
                        {change.before && (
                          <div className="bg-red-50 p-3 rounded">
                            <p className="text-sm font-medium mb-1">Before:</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(change.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {change.after && (
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-sm font-medium mb-1">After:</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(change.after, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {change.data && !change.before && !change.after && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium mb-1">Data:</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(change.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Annotations ({annotations.get(change.id)?.length || 0})
                            </span>
                            {onAnnotate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // TODO: Open annotation dialog
                                  console.log('Add annotation for:', change.id)
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Add Note
                              </Button>
                            )}
                          </div>
                          
                          {annotations.get(change.id) && annotations.get(change.id)!.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {annotations.get(change.id)!.map((annotation) => (
                                <div key={annotation.id} className="bg-gray-50 p-2 rounded text-sm">
                                  <div className="flex items-start gap-2">
                                    {annotation.type === 'concern' && <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />}
                                    {annotation.type === 'approval' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                                    {annotation.type === 'comment' && <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />}
                                    <div className="flex-grow">
                                      <p>{annotation.text}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {annotation.author} • {new Date(annotation.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </div>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}