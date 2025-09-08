import React, { useState } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'
import { Card } from '../../ui/card'
import { Textarea } from '../../ui/textarea'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { EdgeAttribute } from './EdgeTypeEditor'

interface EdgeAttributeEditorProps {
  attributes: EdgeAttribute[]
  onChange: (attributes: EdgeAttribute[]) => void
}

const FIELD_TYPES = [
  { value: 'str', label: 'String' },
  { value: 'int', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'bool', label: 'Boolean' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'date', label: 'Date' },
  { value: 'List[str]', label: 'List of Strings' },
  { value: 'Dict[str, Any]', label: 'Dictionary' },
  { value: 'UUID', label: 'UUID' },
  { value: 'Enum', label: 'Enum' }
]

export const EdgeAttributeEditor: React.FC<EdgeAttributeEditorProps> = ({
  attributes,
  onChange
}) => {
  const [newAttribute, setNewAttribute] = useState<EdgeAttribute>({
    name: '',
    type: 'str',
    isOptional: false,
    description: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddAttribute = () => {
    if (newAttribute.name.trim()) {
      // Convert to snake_case
      const snakeCaseName = newAttribute.name
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/[\s-]+/g, '_')

      onChange([
        ...attributes,
        {
          ...newAttribute,
          name: snakeCaseName
        }
      ])

      // Reset form
      setNewAttribute({
        name: '',
        type: 'str',
        isOptional: false,
        description: ''
      })
      setShowAddForm(false)
    }
  }

  const handleRemoveAttribute = (index: number) => {
    onChange(attributes.filter((_, i) => i !== index))
  }

  const handleUpdateAttribute = (index: number, updates: Partial<EdgeAttribute>) => {
    onChange(
      attributes.map((attr, i) =>
        i === index ? { ...attr, ...updates } : attr
      )
    )
  }


  return (
    <div className="space-y-6 p-4">
      <div className="text-sm text-muted-foreground">
        Define attributes for this edge type
      </div>
      
      {attributes.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          No attributes defined. Add attributes to capture relationship metadata.
        </div>
      )}

      {attributes.map((attribute, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-start gap-4">
            <button
              className="mt-2 cursor-move text-muted-foreground hover:text-foreground"
              onMouseDown={(e) => {
                e.preventDefault()
                // Implement drag and drop if needed
              }}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label>Attribute Name</Label>
                  <Input
                    value={attribute.name}
                    onChange={(e) => {
                      const snakeCaseName = e.target.value
                        .replace(/([A-Z])/g, '_$1')
                        .toLowerCase()
                        .replace(/^_/, '')
                        .replace(/[\s-]+/g, '_')
                      handleUpdateAttribute(index, { name: snakeCaseName })
                    }}
                    placeholder="attribute_name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={attribute.type}
                    onValueChange={(value) =>
                      handleUpdateAttribute(index, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={attribute.description || ''}
                  onChange={(e) =>
                    handleUpdateAttribute(index, { description: e.target.value })
                  }
                  placeholder="Describe this attribute..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={attribute.isOptional}
                    onCheckedChange={(checked) =>
                      handleUpdateAttribute(index, { isOptional: checked })
                    }
                  />
                  <Label>Optional</Label>
                </div>

                {attribute.type === 'str' && (
                  <Input
                    className="w-32"
                    placeholder="Default value"
                    value={attribute.default || ''}
                    onChange={(e) =>
                      handleUpdateAttribute(index, { default: e.target.value || undefined })
                    }
                  />
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveAttribute(index)}
              className="mt-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {showAddForm && (
        <Card className="p-6 border-2 border-primary/20">
          <div className="space-y-6">
            <h4 className="font-semibold">Add New Attribute</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Attribute Name</Label>
                <Input
                  value={newAttribute.name}
                  onChange={(e) =>
                    setNewAttribute(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., start_date, role, percentage"
                />
              </div>

              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={newAttribute.type}
                  onValueChange={(value) =>
                    setNewAttribute(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={newAttribute.description || ''}
                onChange={(e) =>
                  setNewAttribute(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what this attribute represents..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newAttribute.isOptional}
                onCheckedChange={(checked) =>
                  setNewAttribute(prev => ({ ...prev, isOptional: checked }))
                }
              />
              <Label>Optional attribute</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewAttribute({
                    name: '',
                    type: 'str',
                    isOptional: false,
                    description: ''
                  })
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAttribute}>
                Add Attribute
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full py-6 border-2 border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Attribute
        </Button>
      )}
    </div>
  )
}