import { describe, it, expect } from 'vitest'
import {
  StringTypeMapper,
  IntegerTypeMapper,
  FloatTypeMapper,
  BooleanTypeMapper,
  DateTimeTypeMapper,
  ListTypeMapper,
  DictTypeMapper,
  OptionalTypeMapper,
  UnionTypeMapper,
  LiteralTypeMapper,
  getFieldTypeMapper,
  validateRegexPattern,
  validateNumericConstraints,
  validateEnumConstraint
} from '../field-type-mappers'

describe('Field Type Mappers', () => {
  describe('Basic Type Mappers', () => {
    it('maps string type correctly', () => {
      expect(StringTypeMapper.toPython()).toBe('str')
      expect(StringTypeMapper.validate('test')).toBe(true)
      expect(StringTypeMapper.validate(123)).toBe(false)
      expect(StringTypeMapper.getImports()).toEqual([])
    })
    
    it('maps integer type correctly', () => {
      expect(IntegerTypeMapper.toPython()).toBe('int')
      expect(IntegerTypeMapper.validate(42)).toBe(true)
      expect(IntegerTypeMapper.validate(3.14)).toBe(false)
      expect(IntegerTypeMapper.validate('42')).toBe(false)
      expect(IntegerTypeMapper.getImports()).toEqual([])
    })
    
    it('maps float type correctly', () => {
      expect(FloatTypeMapper.toPython()).toBe('float')
      expect(FloatTypeMapper.validate(3.14)).toBe(true)
      expect(FloatTypeMapper.validate(42)).toBe(true)
      expect(FloatTypeMapper.validate('3.14')).toBe(false)
      expect(FloatTypeMapper.getImports()).toEqual([])
    })
    
    it('maps boolean type correctly', () => {
      expect(BooleanTypeMapper.toPython()).toBe('bool')
      expect(BooleanTypeMapper.validate(true)).toBe(true)
      expect(BooleanTypeMapper.validate(false)).toBe(true)
      expect(BooleanTypeMapper.validate(1)).toBe(false)
      expect(BooleanTypeMapper.getImports()).toEqual([])
    })
    
    it('maps datetime type correctly', () => {
      expect(DateTimeTypeMapper.toPython()).toBe('datetime')
      expect(DateTimeTypeMapper.validate(new Date())).toBe(true)
      expect(DateTimeTypeMapper.validate('2024-01-01')).toBe(true)
      expect(DateTimeTypeMapper.validate(123456)).toBe(false)
      expect(DateTimeTypeMapper.getImports()).toEqual(['from datetime import datetime'])
    })
  })
  
  describe('Complex Type Mappers', () => {
    it('maps list type correctly', () => {
      const listMapper = new ListTypeMapper(StringTypeMapper)
      expect(listMapper.toPython()).toBe('List[str]')
      expect(listMapper.validate(['a', 'b', 'c'])).toBe(true)
      expect(listMapper.validate(['a', 1, 'c'])).toBe(false)
      expect(listMapper.validate('not a list')).toBe(false)
      expect(listMapper.getImports()).toContain('from typing import List')
    })
    
    it('maps nested list type correctly', () => {
      const nestedListMapper = new ListTypeMapper(new ListTypeMapper(IntegerTypeMapper))
      expect(nestedListMapper.toPython()).toBe('List[List[int]]')
      expect(nestedListMapper.validate([[1, 2], [3, 4]])).toBe(true)
      expect(nestedListMapper.validate([[1, '2'], [3, 4]])).toBe(false)
    })
    
    it('maps dict type correctly', () => {
      const dictMapper = new DictTypeMapper(StringTypeMapper, IntegerTypeMapper)
      expect(dictMapper.toPython()).toBe('Dict[str, int]')
      expect(dictMapper.validate({ a: 1, b: 2 })).toBe(true)
      expect(dictMapper.validate({ a: '1', b: 2 })).toBe(false)
      expect(dictMapper.validate('not a dict')).toBe(false)
      expect(dictMapper.getImports()).toContain('from typing import Dict')
    })
    
    it('maps optional type correctly', () => {
      const optionalMapper = new OptionalTypeMapper(StringTypeMapper)
      expect(optionalMapper.toPython()).toBe('Optional[str]')
      expect(optionalMapper.validate('test')).toBe(true)
      expect(optionalMapper.validate(null)).toBe(true)
      expect(optionalMapper.validate(undefined)).toBe(true)
      expect(optionalMapper.validate(123)).toBe(false)
      expect(optionalMapper.getImports()).toContain('from typing import Optional')
    })
    
    it('maps union type correctly', () => {
      const unionMapper = new UnionTypeMapper([StringTypeMapper, IntegerTypeMapper])
      expect(unionMapper.toPython()).toBe('Union[str, int]')
      expect(unionMapper.validate('test')).toBe(true)
      expect(unionMapper.validate(42)).toBe(true)
      expect(unionMapper.validate(3.14)).toBe(false)
      expect(unionMapper.getImports()).toContain('from typing import Union')
    })
    
    it('maps literal type correctly', () => {
      const literalMapper = new LiteralTypeMapper(['active', 'inactive', 'pending'])
      expect(literalMapper.toPython()).toBe("Literal['active', 'inactive', 'pending']")
      expect(literalMapper.validate('active')).toBe(true)
      expect(literalMapper.validate('invalid')).toBe(false)
      expect(literalMapper.getImports()).toContain('from typing import Literal')
    })
    
    it('handles empty string in literal enum', () => {
      const literalMapper = new LiteralTypeMapper(['', 'active', 'inactive'])
      expect(literalMapper.toPython()).toBe("Literal['', 'active', 'inactive']")
      expect(literalMapper.validate('')).toBe(true)
      expect(literalMapper.validate('active')).toBe(true)
    })
  })
  
  describe('getFieldTypeMapper', () => {
    it('retrieves basic type mappers', () => {
      const mapper = getFieldTypeMapper('str')
      expect(mapper.toPython()).toBe('str')
    })
    
    it('creates list type mapper from structure', () => {
      const mapper = getFieldTypeMapper({ list: 'int' })
      expect(mapper.toPython()).toBe('List[int]')
    })
    
    it('creates dict type mapper from structure', () => {
      const mapper = getFieldTypeMapper({ dict: { key: 'str', value: 'float' } })
      expect(mapper.toPython()).toBe('Dict[str, float]')
    })
    
    it('creates union type mapper from structure', () => {
      const mapper = getFieldTypeMapper({ union: ['str', 'int', 'bool'] })
      expect(mapper.toPython()).toBe('Union[str, int, bool]')
    })
    
    it('creates optional type mapper from structure', () => {
      const mapper = getFieldTypeMapper({ optional: 'datetime' })
      expect(mapper.toPython()).toBe('Optional[datetime]')
    })
    
    it('throws error for unknown type', () => {
      expect(() => getFieldTypeMapper('unknown')).toThrow('Unknown field type: unknown')
    })
    
    it('throws error for unsupported structure', () => {
      expect(() => getFieldTypeMapper({ unsupported: 'type' })).toThrow('Unsupported field type structure')
    })
  })
  
  describe('Validation Helpers', () => {
    describe('validateRegexPattern', () => {
      it('validates correct regex patterns', () => {
        expect(validateRegexPattern('^[a-z]+$')).toBe(true)
        expect(validateRegexPattern('\\d{3}-\\d{4}')).toBe(true)
        expect(validateRegexPattern('.*')).toBe(true)
      })
      
      it('detects invalid regex patterns', () => {
        expect(validateRegexPattern('[invalid(regex')).toBe(false)
        expect(validateRegexPattern('(unclosed')).toBe(false)
        expect(validateRegexPattern('[z-a]')).toBe(false)
      })
      
      it('handles regex with special characters', () => {
        expect(validateRegexPattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')).toBe(true)
        expect(validateRegexPattern('\\w+@\\w+\\.\\w+')).toBe(true)
      })
    })
    
    describe('validateNumericConstraints', () => {
      it('accepts valid numeric constraints', () => {
        expect(validateNumericConstraints({ gt: 0, lt: 100 })).toEqual([])
        expect(validateNumericConstraints({ ge: 0, le: 100 })).toEqual([])
        expect(validateNumericConstraints({ gt: 5 })).toEqual([])
      })
      
      it('detects conflicting gt/ge constraints', () => {
        const errors = validateNumericConstraints({ gt: 10, ge: 5 })
        expect(errors).toContain('Cannot have both gt and ge constraints')
      })
      
      it('detects conflicting lt/le constraints', () => {
        const errors = validateNumericConstraints({ lt: 10, le: 15 })
        expect(errors).toContain('Cannot have both lt and le constraints')
      })
      
      it('detects invalid gt/lt relationship', () => {
        const errors = validateNumericConstraints({ gt: 100, lt: 50 })
        expect(errors).toContain('Conflicting constraints: gt (100) must be less than lt (50)')
      })
      
      it('detects invalid ge/le relationship', () => {
        const errors = validateNumericConstraints({ ge: 100, le: 50 })
        expect(errors).toContain('Conflicting constraints: ge (100) must be less than or equal to le (50)')
      })
      
      it('accepts equal ge/le values', () => {
        expect(validateNumericConstraints({ ge: 50, le: 50 })).toEqual([])
      })
      
      it('handles boundary values correctly', () => {
        expect(validateNumericConstraints({ ge: 0, le: 150 })).toEqual([])
        expect(validateNumericConstraints({ gt: -1, lt: 151 })).toEqual([])
      })
    })
    
    describe('validateEnumConstraint', () => {
      it('accepts valid enum constraints', () => {
        expect(validateEnumConstraint(['active', 'inactive', 'pending'])).toEqual([])
        expect(validateEnumConstraint([1, 2, 3])).toEqual([])
      })
      
      it('allows empty string in enum', () => {
        expect(validateEnumConstraint(['', 'active', 'inactive'])).toEqual([])
      })
      
      it('detects empty enum', () => {
        const errors = validateEnumConstraint([])
        expect(errors).toContain('Enum constraint must have at least one value')
      })
      
      it('detects duplicate values', () => {
        const errors = validateEnumConstraint(['active', 'inactive', 'active'])
        expect(errors).toContain('Enum values must be unique')
      })
      
      it('handles mixed type enums', () => {
        expect(validateEnumConstraint(['string', 123, true, null])).toEqual([])
      })
    })
  })
})