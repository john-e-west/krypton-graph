import React from 'react'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { EdgeTypeDefinition } from './EdgeTypeEditor'

interface EdgeTypeFormProps {
  edgeType: EdgeTypeDefinition
  onChange: (updates: Partial<EdgeTypeDefinition>) => void
}

const EDGE_CATEGORIES = [
  'Employment',
  'Ownership',
  'Partnership',
  'Membership',
  'Transaction',
  'Communication',
  'Location',
  'Temporal',
  'Hierarchical',
  'Association',
  'Other'
]

export const EdgeTypeForm: React.FC<EdgeTypeFormProps> = ({
  edgeType,
  onChange
}) => {
  const handleNameChange = (name: string) => {
    // Auto-format to PascalCase
    const formatted = name
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
    
    onChange({ name: formatted })
  }

  const handleMetadataChange = (key: string, value: any) => {
    onChange({
      metadata: {
        ...edgeType.metadata,
        [key]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="edge-name">Edge Name *</Label>
        <Input
          id="edge-name"
          placeholder="e.g., Employment, Ownership, Partnership"
          value={edgeType.name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Name will be auto-formatted to PascalCase
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="edge-description">Description</Label>
        <Textarea
          id="edge-description"
          placeholder="Describe what this edge represents..."
          value={edgeType.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="edge-category">Category</Label>
        <Select
          value={edgeType.metadata.category}
          onValueChange={(value) => handleMetadataChange('category', value)}
        >
          <SelectTrigger id="edge-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {EDGE_CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is-directional"
          checked={edgeType.metadata.isDirectional}
          onCheckedChange={(checked) => handleMetadataChange('isDirectional', checked)}
        />
        <Label htmlFor="is-directional">
          Directional Edge
          <span className="block text-xs text-muted-foreground font-normal">
            {edgeType.metadata.isDirectional
              ? 'Edge has a specific direction (A → B)'
              : 'Edge is bidirectional (A ↔ B)'}
          </span>
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edge-icon">Icon (optional)</Label>
          <Input
            id="edge-icon"
            placeholder="e.g., arrow-right, link"
            value={edgeType.metadata.icon || ''}
            onChange={(e) => handleMetadataChange('icon', e.target.value || undefined)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edge-color">Color (optional)</Label>
          <Input
            id="edge-color"
            placeholder="e.g., #3B82F6, blue"
            value={edgeType.metadata.color || ''}
            onChange={(e) => handleMetadataChange('color', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  )
}