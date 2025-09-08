import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import type { EntityField, FieldType } from '@/types/ontology'

interface FieldRendererProps {
  field: EntityField
  value: any
  onChange: (value: any) => void
  errors?: string[]
}

export default function FieldRenderer({
  field,
  value,
  onChange,
  errors
}: FieldRendererProps) {
  const renderField = () => {
    const fieldType = field.type
    
    if (typeof fieldType === 'string') {
      switch (fieldType) {
        case 'str':
          return renderStringField()
        case 'int':
          return renderIntField()
        case 'float':
          return renderFloatField()
        case 'bool':
          return renderBoolField()
        case 'datetime':
          return renderDateTimeField()
        default:
          return renderStringField()
      }
    } else if ('list' in fieldType) {
      return renderListField(fieldType.list)
    } else if ('dict' in fieldType) {
      return renderDictField()
    } else if ('union' in fieldType) {
      return renderUnionField(fieldType.union)
    } else if ('custom' in fieldType) {
      return renderCustomField()
    }
    
    return renderStringField()
  }

  const renderStringField = () => {
    const constraints = field.constraints
    const isLongText = constraints?.maxLength && constraints.maxLength > 100
    
    if (constraints?.enum) {
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.name}`} />
          </SelectTrigger>
          <SelectContent>
            {constraints.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    
    if (isLongText) {
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description}
          minLength={constraints?.minLength}
          maxLength={constraints?.maxLength}
          rows={3}
        />
      )
    }
    
    return (
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.description}
        minLength={constraints?.minLength}
        maxLength={constraints?.maxLength}
        pattern={constraints?.pattern}
      />
    )
  }

  const renderIntField = () => {
    const constraints = field.constraints
    
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        placeholder={field.description}
        min={constraints?.ge ?? constraints?.gt}
        max={constraints?.le ?? constraints?.lt}
        step="1"
      />
    )
  }

  const renderFloatField = () => {
    const constraints = field.constraints
    
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
        placeholder={field.description}
        min={constraints?.ge ?? constraints?.gt}
        max={constraints?.le ?? constraints?.lt}
        step="0.01"
      />
    )
  }

  const renderBoolField = () => {
    return (
      <div className="flex items-center space-x-2">
        <Switch
          checked={value ?? false}
          onCheckedChange={onChange}
        />
        <Label>{field.description || field.name}</Label>
      </div>
    )
  }

  const renderDateTimeField = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dateValue = value ? new Date(value) : undefined
    
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onChange(date?.toISOString())
              setIsOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  const renderListField = (itemType: FieldType) => {
    const items = Array.isArray(value) ? value : []
    
    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const newItems = [...items]
                newItems[index] = e.target.value
                onChange(newItems)
              }}
              placeholder={`Item ${index + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newItems = items.filter((_, i) => i !== index)
                onChange(newItems)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ''])}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
    )
  }

  const renderDictField = () => {
    const entries = value ? Object.entries(value) : []
    
    return (
      <div className="space-y-2">
        {entries.map(([key, val], index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={key}
              onChange={(e) => {
                const newValue = { ...value }
                delete newValue[key]
                newValue[e.target.value] = val
                onChange(newValue)
              }}
              placeholder="Key"
            />
            <Input
              value={val}
              onChange={(e) => {
                onChange({ ...value, [key]: e.target.value })
              }}
              placeholder="Value"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newValue = { ...value }
                delete newValue[key]
                onChange(newValue)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...value, '': '' })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>
    )
  }

  const renderUnionField = (types: FieldType[]) => {
    // Simplified union handling - just render as string for now
    return renderStringField()
  }

  const renderCustomField = () => {
    return renderStringField()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.name}
        {!field.isOptional && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      {renderField()}
      {errors && errors.length > 0 && (
        <div className="text-sm text-destructive">
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}
    </div>
  )
}