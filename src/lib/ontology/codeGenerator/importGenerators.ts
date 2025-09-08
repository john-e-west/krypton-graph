import type { EntityTypeDefinition } from '@/types/ontology'

export function collectTypingImports(entity: EntityTypeDefinition): string[] {
  const imports: string[] = []
  
  const hasOptional = entity.fields.some(f => f.isOptional)
  const hasList = entity.fields.some(f => typeof f.type === 'object' && 'list' in f.type)
  const hasDict = entity.fields.some(f => typeof f.type === 'object' && 'dict' in f.type)
  const hasUnion = entity.fields.some(f => typeof f.type === 'object' && 'union' in f.type)
  
  if (hasOptional) imports.push('Optional')
  if (hasList) imports.push('List')
  if (hasDict) imports.push('Dict')
  if (hasUnion) imports.push('Union')
  
  return imports
}

export function generateImports(entity: EntityTypeDefinition): string {
  const imports = new Set<string>([
    'from pydantic import BaseModel, Field'
  ])
  
  const typingImports = collectTypingImports(entity)
  if (typingImports.length > 0) {
    imports.add(`from typing import ${typingImports.join(', ')}`)
  }
  
  const hasDatetime = entity.fields.some(f => f.type === 'datetime')
  if (hasDatetime) {
    imports.add('from datetime import datetime')
  }
  
  const hasValidators = entity.fields.some(f => 
    f.constraints?.validators && f.constraints.validators.length > 0
  )
  if (hasValidators) {
    imports.add('from pydantic import validator')
  }
  
  return Array.from(imports).sort().join('\n')
}