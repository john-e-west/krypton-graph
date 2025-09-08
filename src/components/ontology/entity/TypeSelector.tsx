import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import type { FieldType, PrimitiveFieldType } from '@/types/ontology'

interface TypeSelectorProps {
  type: FieldType
  onChange: (type: FieldType) => void
}

const PRIMITIVE_TYPES: PrimitiveFieldType[] = ['str', 'int', 'float', 'bool', 'datetime']

const COMPLEX_TYPE_OPTIONS = [
  { value: 'primitive', label: 'Primitive' },
  { value: 'list', label: 'List' },
  { value: 'dict', label: 'Dictionary' },
  { value: 'union', label: 'Union' },
  { value: 'custom', label: 'Custom' }
]

export default function TypeSelector({ type, onChange }: TypeSelectorProps) {
  const [complexType, setComplexType] = useState<string>(() => {
    if (typeof type === 'string') return 'primitive'
    if ('list' in type) return 'list'
    if ('dict' in type) return 'dict'
    if ('union' in type) return 'union'
    if ('custom' in type) return 'custom'
    return 'primitive'
  })

  const handleComplexTypeChange = (newComplexType: string) => {
    setComplexType(newComplexType)
    
    switch (newComplexType) {
      case 'primitive':
        onChange('str')
        break
      case 'list':
        onChange({ list: 'str' })
        break
      case 'dict':
        onChange({ dict: { key: 'str', value: 'str' } })
        break
      case 'union':
        onChange({ union: ['str'] })
        break
      case 'custom':
        onChange({ custom: 'CustomType' })
        break
    }
  }

  const renderPrimitiveSelector = () => {
    const currentType = typeof type === 'string' ? type : 'str'
    return (
      <Select value={currentType} onValueChange={(value) => onChange(value as PrimitiveFieldType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIMITIVE_TYPES.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderListEditor = () => {
    if (!('list' in type)) return null
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">List of:</div>
        <TypeSelector
          type={type.list}
          onChange={(newType) => onChange({ list: newType })}
        />
      </div>
    )
  }

  const renderDictEditor = () => {
    if (!('dict' in type)) return null
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Key type:</div>
            <TypeSelector
              type={type.dict.key}
              onChange={(newType) => onChange({ 
                dict: { ...type.dict, key: newType } 
              })}
            />
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Value type:</div>
            <TypeSelector
              type={type.dict.value}
              onChange={(newType) => onChange({ 
                dict: { ...type.dict, value: newType } 
              })}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderUnionEditor = () => {
    if (!('union' in type)) return null
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Union of types:</div>
        <div className="space-y-2">
          {type.union.map((unionType, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <TypeSelector
                  type={unionType}
                  onChange={(newType) => {
                    const newUnion = [...type.union]
                    newUnion[index] = newType
                    onChange({ union: newUnion })
                  }}
                />
              </div>
              {type.union.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newUnion = type.union.filter((_, i) => i !== index)
                    onChange({ union: newUnion })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ union: [...type.union, 'str'] })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>
    )
  }

  const renderCustomEditor = () => {
    if (!('custom' in type)) return null
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Custom type name:</div>
        <Input
          value={type.custom}
          onChange={(e) => onChange({ custom: e.target.value })}
          placeholder="CustomEntityType"
          className="font-mono"
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Select value={complexType} onValueChange={handleComplexTypeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPLEX_TYPE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="border rounded-md p-3 bg-muted/10">
        {complexType === 'primitive' && renderPrimitiveSelector()}
        {complexType === 'list' && renderListEditor()}
        {complexType === 'dict' && renderDictEditor()}
        {complexType === 'union' && renderUnionEditor()}
        {complexType === 'custom' && renderCustomEditor()}
      </div>
    </div>
  )
}