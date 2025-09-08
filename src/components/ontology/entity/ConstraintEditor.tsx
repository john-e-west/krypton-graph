import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import type { FieldConstraints, FieldType } from '@/types/ontology'

interface ConstraintEditorProps {
  constraints?: FieldConstraints
  fieldType: FieldType
  onChange: (constraints: FieldConstraints | undefined) => void
}

export default function ConstraintEditor({ 
  constraints = {}, 
  fieldType, 
  onChange 
}: ConstraintEditorProps) {
  const isStringType = typeof fieldType === 'string' && fieldType === 'str'
  const isNumericType = typeof fieldType === 'string' && ['int', 'float'].includes(fieldType)
  
  const updateConstraint = (key: keyof FieldConstraints, value: any) => {
    if (value === '' || value === undefined) {
      const newConstraints = { ...constraints }
      delete newConstraints[key]
      onChange(Object.keys(newConstraints).length > 0 ? newConstraints : undefined)
    } else {
      onChange({ ...constraints, [key]: value })
    }
  }
  
  const addEnumValue = () => {
    const currentEnum = constraints.enum || []
    updateConstraint('enum', [...currentEnum, ''])
  }
  
  const updateEnumValue = (index: number, value: string) => {
    const newEnum = [...(constraints.enum || [])]
    newEnum[index] = value
    updateConstraint('enum', newEnum)
  }
  
  const removeEnumValue = (index: number) => {
    const newEnum = (constraints.enum || []).filter((_, i) => i !== index)
    updateConstraint('enum', newEnum.length > 0 ? newEnum : undefined)
  }
  
  const addValidator = () => {
    const currentValidators = constraints.validators || []
    updateConstraint('validators', [...currentValidators, ''])
  }
  
  const updateValidator = (index: number, value: string) => {
    const newValidators = [...(constraints.validators || [])]
    newValidators[index] = value
    updateConstraint('validators', newValidators)
  }
  
  const removeValidator = (index: number) => {
    const newValidators = (constraints.validators || []).filter((_, i) => i !== index)
    updateConstraint('validators', newValidators.length > 0 ? newValidators : undefined)
  }
  
  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Field Constraints</h4>
      
      {isStringType && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Min Length</Label>
            <Input
              type="number"
              min="0"
              value={constraints.minLength ?? ''}
              onChange={(e) => updateConstraint('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="0"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Max Length</Label>
            <Input
              type="number"
              min="0"
              value={constraints.maxLength ?? ''}
              onChange={(e) => updateConstraint('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Unlimited"
            />
          </div>
          
          <div className="grid gap-2 col-span-2">
            <Label>Regex Pattern</Label>
            <Input
              value={constraints.pattern ?? ''}
              onChange={(e) => updateConstraint('pattern', e.target.value || undefined)}
              placeholder="^[A-Z][a-z]+$"
              className="font-mono"
            />
          </div>
        </div>
      )}
      
      {isNumericType && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Greater Than (gt)</Label>
            <Input
              type="number"
              value={constraints.gt ?? ''}
              onChange={(e) => updateConstraint('gt', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Exclusive min"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Greater or Equal (ge)</Label>
            <Input
              type="number"
              value={constraints.ge ?? ''}
              onChange={(e) => updateConstraint('ge', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Inclusive min"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Less Than (lt)</Label>
            <Input
              type="number"
              value={constraints.lt ?? ''}
              onChange={(e) => updateConstraint('lt', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Exclusive max"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Less or Equal (le)</Label>
            <Input
              type="number"
              value={constraints.le ?? ''}
              onChange={(e) => updateConstraint('le', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Inclusive max"
            />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Enum Values</Label>
          <Button variant="outline" size="sm" onClick={addEnumValue}>
            <Plus className="h-3 w-3 mr-1" />
            Add Value
          </Button>
        </div>
        {constraints.enum && constraints.enum.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => updateEnumValue(index, e.target.value)}
              placeholder="Enum value"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeEnumValue(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Custom Validators</Label>
          <Button variant="outline" size="sm" onClick={addValidator}>
            <Plus className="h-3 w-3 mr-1" />
            Add Validator
          </Button>
        </div>
        {constraints.validators && constraints.validators.map((validator, index) => (
          <div key={index} className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={validator}
                onChange={(e) => updateValidator(index, e.target.value)}
                placeholder="# Custom validation logic&#10;if not condition:&#10;    raise ValueError('Error message')"
                rows={3}
                className="font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeValidator(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid gap-2">
        <Label>Constant Value</Label>
        <Input
          value={constraints.const ?? ''}
          onChange={(e) => updateConstraint('const', e.target.value || undefined)}
          placeholder="Fixed value"
        />
      </div>
    </div>
  )
}