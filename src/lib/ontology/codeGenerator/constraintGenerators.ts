import type { FieldConstraints } from '@/types/ontology'

export function generateStringConstraints(constraints: FieldConstraints): string[] {
  const parts: string[] = []
  
  if (constraints.minLength !== undefined) {
    parts.push(`min_length=${constraints.minLength}`)
  }
  if (constraints.maxLength !== undefined) {
    parts.push(`max_length=${constraints.maxLength}`)
  }
  if (constraints.pattern !== undefined) {
    parts.push(`regex="${constraints.pattern}"`)
  }
  
  return parts
}

export function generateNumericConstraints(constraints: FieldConstraints): string[] {
  const parts: string[] = []
  
  if (constraints.gt !== undefined) {
    parts.push(`gt=${constraints.gt}`)
  }
  if (constraints.ge !== undefined) {
    parts.push(`ge=${constraints.ge}`)
  }
  if (constraints.lt !== undefined) {
    parts.push(`lt=${constraints.lt}`)
  }
  if (constraints.le !== undefined) {
    parts.push(`le=${constraints.le}`)
  }
  
  return parts
}

export function generateConstraints(constraints: FieldConstraints | undefined): string {
  if (!constraints) return ''
  
  const parts: string[] = [
    ...generateStringConstraints(constraints),
    ...generateNumericConstraints(constraints)
  ]
  
  return parts.length > 0 ? `, ${parts.join(', ')}` : ''
}