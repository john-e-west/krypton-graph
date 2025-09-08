import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EntityTypeDefinition } from '@/types/ontology'

interface EntityTypeFormProps {
  entity: EntityTypeDefinition
  onUpdate: (updates: Partial<EntityTypeDefinition>) => void
}

export default function EntityTypeForm({ entity, onUpdate }: EntityTypeFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Entity Name</Label>
        <Input
          id="name"
          value={entity.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="PersonEntity"
          className="font-mono"
        />
        <p className="text-sm text-muted-foreground">
          PascalCase class name for the entity type
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={entity.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Represents a person with their attributes..."
          rows={3}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="baseClass">Base Class</Label>
        <Select 
          value={entity.baseClass} 
          onValueChange={(value: 'BaseModel' | 'CustomBase') => onUpdate({ baseClass: value })}
        >
          <SelectTrigger id="baseClass">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BaseModel">BaseModel</SelectItem>
            <SelectItem value="CustomBase">CustomBase</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-4">
        <h3 className="text-sm font-medium">Metadata</h3>
        
        <div className="grid gap-2">
          <Label htmlFor="icon">Icon (optional)</Label>
          <Input
            id="icon"
            value={entity.metadata?.icon || ''}
            onChange={(e) => onUpdate({ 
              metadata: { ...entity.metadata, icon: e.target.value }
            })}
            placeholder="user"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="color">Color (optional)</Label>
          <Input
            id="color"
            value={entity.metadata?.color || ''}
            onChange={(e) => onUpdate({ 
              metadata: { ...entity.metadata, color: e.target.value }
            })}
            placeholder="#3B82F6"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="category">Category (optional)</Label>
          <Input
            id="category"
            value={entity.metadata?.category || ''}
            onChange={(e) => onUpdate({ 
              metadata: { ...entity.metadata, category: e.target.value }
            })}
            placeholder="Core Entities"
          />
        </div>
      </div>
    </div>
  )
}