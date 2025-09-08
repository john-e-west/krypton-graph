'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AttributeDefinition {
  name: string
  type: string
  required: boolean
  description?: string
}

interface EntityTypeData {
  id?: string
  name: string
  description: string
  attributes: AttributeDefinition[]
  examplePattern?: string
}

interface EdgeTypeData {
  id?: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  examplePattern?: string
}

interface TypeEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  typeData?: EntityTypeData | EdgeTypeData
  typeKind: 'entity' | 'edge'
  availableEntityTypes?: string[]
  onSave: (data: EntityTypeData | EdgeTypeData) => void
  onValidate?: (name: string) => { valid: boolean; message?: string }
}

export function TypeEditorDialog({
  open,
  onOpenChange,
  typeData,
  typeKind,
  availableEntityTypes = [],
  onSave,
  onValidate
}: TypeEditorDialogProps) {
  const [formData, setFormData] = React.useState<EntityTypeData | EdgeTypeData>(
    typeData || (typeKind === 'entity' 
      ? { name: '', description: '', attributes: [] }
      : { name: '', description: '', sourceTypes: [], targetTypes: [] })
  )
  const [exampleText, setExampleText] = React.useState('')
  const [testResult, setTestResult] = React.useState<{ matches: boolean; message: string } | null>(null)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [newAttribute, setNewAttribute] = React.useState<AttributeDefinition>({
    name: '',
    type: 'string',
    required: false,
    description: ''
  })

  React.useEffect(() => {
    if (typeData) {
      setFormData(typeData)
    } else {
      setFormData(typeKind === 'entity' 
        ? { name: '', description: '', attributes: [] }
        : { name: '', description: '', sourceTypes: [], targetTypes: [] })
    }
    setExampleText('')
    setTestResult(null)
    setValidationError(null)
  }, [typeData, typeKind, open])

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name })
    if (onValidate) {
      const validation = onValidate(name)
      setValidationError(validation.valid ? null : validation.message || 'Invalid name')
    }
  }

  const isEntityType = (data: any): data is EntityTypeData => {
    return 'attributes' in data
  }

  const addAttribute = () => {
    if (isEntityType(formData) && newAttribute.name) {
      setFormData({
        ...formData,
        attributes: [...formData.attributes, { ...newAttribute }]
      })
      setNewAttribute({
        name: '',
        type: 'string',
        required: false,
        description: ''
      })
    }
  }

  const removeAttribute = (index: number) => {
    if (isEntityType(formData)) {
      setFormData({
        ...formData,
        attributes: formData.attributes.filter((_, i) => i !== index)
      })
    }
  }

  const testPattern = () => {
    if (!exampleText || !formData.examplePattern) {
      setTestResult({ matches: false, message: 'Please provide both a pattern and test text' })
      return
    }

    try {
      const regex = new RegExp(formData.examplePattern, 'i')
      const matches = regex.test(exampleText)
      setTestResult({
        matches,
        message: matches 
          ? `✓ Pattern matches: "${exampleText}"`
          : `✗ Pattern does not match: "${exampleText}"`
      })
    } catch (error) {
      setTestResult({
        matches: false,
        message: `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  const handleSave = () => {
    if (!formData.name || !formData.description) {
      setValidationError('Name and description are required')
      return
    }

    if (validationError) {
      return
    }

    onSave(formData)
    onOpenChange(false)
  }

  const toggleSourceType = (type: string) => {
    if (!isEntityType(formData)) {
      const sourceTypes = formData.sourceTypes.includes(type)
        ? formData.sourceTypes.filter(t => t !== type)
        : [...formData.sourceTypes, type]
      setFormData({ ...formData, sourceTypes })
    }
  }

  const toggleTargetType = (type: string) => {
    if (!isEntityType(formData)) {
      const targetTypes = formData.targetTypes.includes(type)
        ? formData.targetTypes.filter(t => t !== type)
        : [...formData.targetTypes, type]
      setFormData({ ...formData, targetTypes })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {typeData ? 'Edit' : 'Create'} {typeKind === 'entity' ? 'Entity' : 'Edge'} Type
          </DialogTitle>
          <DialogDescription>
            Define the properties and patterns for this type
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 p-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={typeKind === 'entity' ? 'e.g., Person' : 'e.g., WORKS_FOR'}
                className={cn(validationError && 'border-red-500')}
              />
              {validationError && (
                <p className="text-sm text-red-500">{validationError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this type represents..."
                rows={3}
              />
            </div>

            {typeKind === 'entity' && isEntityType(formData) && (
              <div className="space-y-2">
                <Label>Attributes</Label>
                <div className="space-y-2">
                  {formData.attributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <span className="font-mono text-sm">{attr.name}</span>
                      <Badge variant="outline">{attr.type}</Badge>
                      {attr.required && <Badge variant="secondary">Required</Badge>}
                      <span className="text-sm text-muted-foreground flex-1">{attr.description}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttribute(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Attribute name"
                      value={newAttribute.name}
                      onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={newAttribute.type}
                      onChange={(e) => setNewAttribute({ ...newAttribute, type: e.target.value })}
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="array">Array</option>
                      <option value="object">Object</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAttribute.required}
                      onChange={(e) => setNewAttribute({ ...newAttribute, required: e.target.checked })}
                    />
                    <span className="text-sm">Required</span>
                  </label>
                  <Button onClick={addAttribute} size="sm" disabled={!newAttribute.name}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {typeKind === 'edge' && !isEntityType(formData) && (
              <>
                <div className="space-y-2">
                  <Label>Source Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableEntityTypes.map(type => (
                      <Badge
                        key={type}
                        variant={formData.sourceTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSourceType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableEntityTypes.map(type => (
                      <Badge
                        key={type}
                        variant={formData.targetTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTargetType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="pattern">Pattern (Regex)</Label>
              <Input
                id="pattern"
                value={formData.examplePattern || ''}
                onChange={(e) => setFormData({ ...formData, examplePattern: e.target.value })}
                placeholder="e.g., \b(works?|employed)\s+(at|for|by)\b"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="example">Test Pattern</Label>
              <div className="flex gap-2">
                <Input
                  id="example"
                  value={exampleText}
                  onChange={(e) => setExampleText(e.target.value)}
                  placeholder="Enter text to test pattern..."
                  className="flex-1"
                />
                <Button onClick={testPattern} variant="outline" size="sm">
                  Test
                </Button>
              </div>
              {testResult && (
                <Alert className={cn(testResult.matches ? 'border-green-500' : 'border-red-500')}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!validationError || !formData.name}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}