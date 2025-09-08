import { describe, it, expect } from 'vitest'
import { generatePydanticCode } from '../codeGenerator'
import type { EntityTypeDefinition } from '@/types/ontology'

describe('generatePydanticCode', () => {
  it('generates basic entity with no fields', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'EmptyEntity',
      description: 'An empty entity',
      baseClass: 'BaseModel',
      fields: [],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from pydantic import BaseModel, Field')
    expect(code).toContain('class EmptyEntity(BaseModel):')
    expect(code).toContain('"""An empty entity"""')
    expect(code).toContain('class Config:')
    expect(code).toContain('use_enum_values = True')
    expect(code).toContain('validate_assignment = True')
  })
  
  it('generates entity with primitive fields', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'PersonEntity',
      description: 'Person entity',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'first_name',
          type: 'str',
          isOptional: false,
          description: 'First name of the person'
        },
        {
          name: 'age',
          type: 'int',
          isOptional: true,
          description: 'Age in years'
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from typing import Optional')
    expect(code).toContain('first_name: str = Field(')
    expect(code).toContain('description="First name of the person"')
    expect(code).toContain('age: Optional[int] = Field(')
    expect(code).toContain('None')
    expect(code).toContain('description="Age in years"')
  })
  
  it('generates entity with list fields', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'CompanyEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'employees',
          type: { list: 'str' },
          isOptional: false
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from typing import List')
    expect(code).toContain('employees: List[str] = Field(')
  })
  
  it('generates entity with dict fields', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'ConfigEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'settings',
          type: { dict: { key: 'str', value: 'int' } },
          isOptional: false
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from typing import Dict')
    expect(code).toContain('settings: Dict[str, int] = Field(')
  })
  
  it('generates entity with union fields', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'FlexibleEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'value',
          type: { union: ['str', 'int', 'float'] },
          isOptional: false
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from typing import Union')
    expect(code).toContain('value: Union[str, int, float] = Field(')
  })
  
  it('generates entity with field constraints', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'ConstrainedEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'email',
          type: 'str',
          isOptional: false,
          constraints: {
            minLength: 5,
            maxLength: 100,
            pattern: '^[a-z]+@[a-z]+\\.[a-z]+'
          }
        },
        {
          name: 'score',
          type: 'float',
          isOptional: false,
          constraints: {
            ge: 0,
            le: 100
          }
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('min_length=5')
    expect(code).toContain('max_length=100')
    expect(code).toContain('regex="^[a-z]+@[a-z]+\\.[a-z]+"')
    expect(code).toContain('ge=0')
    expect(code).toContain('le=100')
  })
  
  it('generates entity with datetime field', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'EventEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'event_date',
          type: 'datetime',
          isOptional: false
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from datetime import datetime')
    expect(code).toContain('event_date: datetime = Field(')
  })
  
  it('generates entity with custom validators', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'ValidatedEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'username',
          type: 'str',
          isOptional: false,
          constraints: {
            validators: [
              "if len(v) < 3:\n        raise ValueError('Username must be at least 3 characters')"
            ]
          }
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('from pydantic import validator')
    expect(code).toContain("@validator('username')")
    expect(code).toContain('def validate_username_0(cls, v):')
    expect(code).toContain("raise ValueError('Username must be at least 3 characters')")
    expect(code).toContain('return v')
  })
  
  it('generates entity with default values', () => {
    const entity: EntityTypeDefinition = {
      id: 'test',
      ontologyId: 'test-ontology',
      name: 'DefaultEntity',
      description: '',
      baseClass: 'BaseModel',
      fields: [
        {
          name: 'status',
          type: 'str',
          isOptional: false,
          default: 'active'
        },
        {
          name: 'count',
          type: 'int',
          isOptional: false,
          default: 0
        }
      ],
      metadata: {},
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      }
    }
    
    const code = generatePydanticCode(entity)
    
    expect(code).toContain('status: str = Field(\n        "active"')
    expect(code).toContain('count: int = Field(\n        0')
  })
})