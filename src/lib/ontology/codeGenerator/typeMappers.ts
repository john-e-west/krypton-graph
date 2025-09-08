import type { FieldType } from '@/types/ontology'

export const PRIMITIVE_TYPE_MAPPINGS: Record<string, string> = {
  'str': 'str',
  'int': 'int',
  'float': 'float',
  'bool': 'bool',
  'datetime': 'datetime'
}

export const COLLECTION_TYPE_MAPPINGS: Record<string, string> = {
  'list_str': 'List[str]',
  'list_int': 'List[int]',
  'dict_str_str': 'Dict[str, str]',
  'optional_str': 'Optional[str]',
  'union_str_int': 'Union[str, int]'
}

export function getFieldTypeString(type: FieldType): string {
  if (typeof type === 'string') {
    return PRIMITIVE_TYPE_MAPPINGS[type] || type
  }
  
  if ('list' in type) {
    const innerType = getFieldTypeString(type.list)
    return `List[${innerType}]`
  }
  
  if ('dict' in type) {
    const keyType = getFieldTypeString(type.dict.key)
    const valueType = getFieldTypeString(type.dict.value)
    return `Dict[${keyType}, ${valueType}]`
  }
  
  if ('union' in type) {
    const types = type.union.map(getFieldTypeString).join(', ')
    return `Union[${types}]`
  }
  
  if ('custom' in type) {
    return type.custom
  }
  
  return 'Any'
}