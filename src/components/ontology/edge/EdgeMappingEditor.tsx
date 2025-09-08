import React, { useState } from 'react'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { Label } from '../../ui/label'
import { Card } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Plus, Trash2, ArrowRight, ArrowLeftRight, AlertCircle } from 'lucide-react'
import { EdgeMapping } from './EdgeTypeEditor'
import { Alert, AlertDescription } from '../../ui/alert'

interface EdgeMappingEditorProps {
  mappings: EdgeMapping[]
  entityTypes: string[]
  onChange: (mappings: EdgeMapping[]) => void
}

export const EdgeMappingEditor: React.FC<EdgeMappingEditorProps> = ({
  mappings,
  entityTypes,
  onChange
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMapping, setNewMapping] = useState<EdgeMapping>({
    sourceEntity: '',
    targetEntity: '',
    cardinality: '1:n'
  })

  const allEntityOptions = ['*', ...entityTypes]

  const handleAddMapping = () => {
    if (newMapping.sourceEntity && newMapping.targetEntity) {
      onChange([...mappings, newMapping])
      setNewMapping({
        sourceEntity: '',
        targetEntity: '',
        cardinality: '1:n'
      })
      setShowAddForm(false)
    }
  }

  const handleRemoveMapping = (index: number) => {
    onChange(mappings.filter((_, i) => i !== index))
  }

  const handleUpdateMapping = (index: number, updates: Partial<EdgeMapping>) => {
    onChange(
      mappings.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping
      )
    )
  }

  const getCardinalityLabel = (cardinality: string) => {
    const labels: Record<string, string> = {
      '1:1': 'One to One',
      '1:n': 'One to Many',
      'n:1': 'Many to One',
      'n:n': 'Many to Many'
    }
    return labels[cardinality] || cardinality
  }

  const getCardinalityIcon = (cardinality: string) => {
    switch (cardinality) {
      case '1:1':
        return <ArrowRight className="h-4 w-4" />
      case '1:n':
      case 'n:1':
        return <ArrowRight className="h-4 w-4" />
      case 'n:n':
        return <ArrowLeftRight className="h-4 w-4" />
      default:
        return <ArrowRight className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Define which entity types this edge can connect. Use wildcards (*) to allow any entity type.
        </AlertDescription>
      </Alert>

      {mappings.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-muted-foreground">
          No mappings defined. Add at least one mapping to specify valid entity connections.
        </div>
      )}

      {mappings.map((mapping, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="px-3 py-1">
                  {mapping.sourceEntity === '*' ? 'Any Entity' : mapping.sourceEntity}
                </Badge>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {getCardinalityIcon(mapping.cardinality)}
                  <span className="text-sm">{getCardinalityLabel(mapping.cardinality)}</span>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {mapping.targetEntity === '*' ? 'Any Entity' : mapping.targetEntity}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMapping(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Source Entity</Label>
                <Select
                  value={mapping.sourceEntity}
                  onValueChange={(value) =>
                    handleUpdateMapping(index, { sourceEntity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allEntityOptions.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity === '*' ? 'Any Entity (*)' : entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Cardinality</Label>
                <Select
                  value={mapping.cardinality}
                  onValueChange={(value) =>
                    handleUpdateMapping(index, { cardinality: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">One to One</SelectItem>
                    <SelectItem value="1:n">One to Many</SelectItem>
                    <SelectItem value="n:1">Many to One</SelectItem>
                    <SelectItem value="n:n">Many to Many</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Target Entity</Label>
                <Select
                  value={mapping.targetEntity}
                  onValueChange={(value) =>
                    handleUpdateMapping(index, { targetEntity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allEntityOptions.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity === '*' ? 'Any Entity (*)' : entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {showAddForm && (
        <Card className="p-4 border-dashed">
          <div className="space-y-4">
            <h4 className="font-semibold">Add New Mapping</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Source Entity</Label>
                <Select
                  value={newMapping.sourceEntity}
                  onValueChange={(value) =>
                    setNewMapping(prev => ({ ...prev, sourceEntity: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEntityOptions.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity === '*' ? 'Any Entity (*)' : entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Cardinality</Label>
                <RadioGroup
                  value={newMapping.cardinality}
                  onValueChange={(value) =>
                    setNewMapping(prev => ({ ...prev, cardinality: value as any }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1:1" id="c1-1" />
                    <Label htmlFor="c1-1" className="text-sm">1:1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1:n" id="c1-n" />
                    <Label htmlFor="c1-n" className="text-sm">1:n</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="n:1" id="cn-1" />
                    <Label htmlFor="cn-1" className="text-sm">n:1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="n:n" id="cn-n" />
                    <Label htmlFor="cn-n" className="text-sm">n:n</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-2">
                <Label>Target Entity</Label>
                <Select
                  value={newMapping.targetEntity}
                  onValueChange={(value) =>
                    setNewMapping(prev => ({ ...prev, targetEntity: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEntityOptions.map(entity => (
                      <SelectItem key={entity} value={entity}>
                        {entity === '*' ? 'Any Entity (*)' : entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewMapping({
                    sourceEntity: '',
                    targetEntity: '',
                    cardinality: '1:n'
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMapping}
                disabled={!newMapping.sourceEntity || !newMapping.targetEntity}
              >
                Add Mapping
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      )}

      {mappings.length > 0 && (
        <Alert>
          <AlertDescription>
            <strong>Examples:</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• Person → Company (Employment): One person can work at many companies over time</li>
              <li>• Company → Company (Partnership): Companies can have partnerships with each other</li>
              <li>• * → * (Generic): Any entity can be related to any other entity</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}