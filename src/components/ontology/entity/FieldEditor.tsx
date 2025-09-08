import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Trash2, GripVertical } from 'lucide-react'
import TypeSelector from './TypeSelector'
import ConstraintEditor from './ConstraintEditor'
import type { EntityField } from '@/types/ontology'

interface FieldEditorProps {
  field: EntityField
  index: number
  onUpdate: (field: EntityField) => void
  onRemove: () => void
  isDragging?: boolean
}

export default function FieldEditor({ 
  field, 
  index, 
  onUpdate, 
  onRemove,
  isDragging 
}: FieldEditorProps) {
  return (
    <Card className={`${isDragging ? 'opacity-50' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="cursor-move pt-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`field-name-${index}`}>Field Name</Label>
                <Input
                  id={`field-name-${index}`}
                  value={field.name}
                  onChange={(e) => onUpdate({ ...field, name: e.target.value })}
                  placeholder="field_name"
                  className="font-mono"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Field Type</Label>
                <TypeSelector
                  type={field.type}
                  onChange={(type) => onUpdate({ ...field, type })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id={`optional-${index}`}
                checked={field.isOptional}
                onCheckedChange={(checked) => onUpdate({ ...field, isOptional: checked })}
              />
              <Label htmlFor={`optional-${index}`} className="cursor-pointer">
                Optional Field
              </Label>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor={`description-${index}`}>Description</Label>
              <Textarea
                id={`description-${index}`}
                value={field.description || ''}
                onChange={(e) => onUpdate({ ...field, description: e.target.value })}
                placeholder="Field description..."
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor={`default-${index}`}>Default Value</Label>
              <Input
                id={`default-${index}`}
                value={field.default ?? ''}
                onChange={(e) => onUpdate({ 
                  ...field, 
                  default: e.target.value === '' ? undefined : e.target.value 
                })}
                placeholder="None"
              />
            </div>
            
            <ConstraintEditor
              constraints={field.constraints}
              fieldType={field.type}
              onChange={(constraints) => onUpdate({ ...field, constraints })}
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}