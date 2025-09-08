import { EntityDefinitionRecord, EdgeDefinitionRecord } from '../../types/airtable'

export class ImportGenerator {
  private standardLibImports = new Set<string>()
  private typingImports = new Set<string>()
  private thirdPartyImports = new Set<string>()

  generate(entities: EntityDefinitionRecord[], edges: EdgeDefinitionRecord[]): string {
    this.reset()
    this.analyzeEntities(entities)
    this.analyzeEdges(edges)
    return this.formatImports()
  }

  private reset() {
    this.standardLibImports.clear()
    this.typingImports.clear()
    this.thirdPartyImports.clear()
    
    // Always include these
    this.thirdPartyImports.add('from pydantic import BaseModel, Field, validator')
  }

  private analyzeEntities(entities: EntityDefinitionRecord[]) {
    entities.forEach(entity => {
      if (entity.fields['Properties JSON']) {
        try {
          const properties = JSON.parse(entity.fields['Properties JSON'])
          this.analyzeProperties(properties)
        } catch {
          // Invalid JSON, skip
        }
      }
    })
  }

  private analyzeEdges(edges: EdgeDefinitionRecord[]) {
    edges.forEach(edge => {
      if (edge.fields['Properties JSON']) {
        try {
          const properties = JSON.parse(edge.fields['Properties JSON'])
          this.analyzeProperties(properties)
        } catch {
          // Invalid JSON, skip
        }
      }
    })
  }

  private analyzeProperties(properties: any) {
    if (!properties || !properties.fields) return

    properties.fields.forEach((field: any) => {
      this.analyzeFieldType(field.type, field.isOptional)
    })
  }

  private analyzeFieldType(fieldType: string, isOptional: boolean) {
    // Handle optional types
    if (isOptional) {
      this.typingImports.add('Optional')
    }

    // Analyze the base type
    const typeStr = fieldType.toLowerCase()

    if (typeStr.includes('datetime')) {
      this.standardLibImports.add('from datetime import datetime')
    }

    if (typeStr.includes('date') && !typeStr.includes('datetime')) {
      this.standardLibImports.add('from datetime import date')
    }

    if (typeStr.includes('time') && !typeStr.includes('datetime')) {
      this.standardLibImports.add('from datetime import time')
    }

    if (typeStr.includes('decimal')) {
      this.standardLibImports.add('from decimal import Decimal')
    }

    if (typeStr.includes('uuid')) {
      this.standardLibImports.add('from uuid import UUID')
    }

    if (typeStr.includes('enum')) {
      this.standardLibImports.add('from enum import Enum')
    }

    if (typeStr.includes('list')) {
      this.typingImports.add('List')
    }

    if (typeStr.includes('dict')) {
      this.typingImports.add('Dict')
      this.typingImports.add('Any')
    }

    if (typeStr.includes('set')) {
      this.typingImports.add('Set')
    }

    if (typeStr.includes('tuple')) {
      this.typingImports.add('Tuple')
    }

    if (typeStr.includes('union')) {
      this.typingImports.add('Union')
    }

    if (typeStr === 'any') {
      this.typingImports.add('Any')
    }

    // Check for custom validators
    if (typeStr.includes('email')) {
      this.thirdPartyImports.add('from pydantic import EmailStr')
    }

    if (typeStr.includes('url')) {
      this.thirdPartyImports.add('from pydantic import HttpUrl')
    }

    if (typeStr.includes('json')) {
      this.standardLibImports.add('import json')
    }
  }

  private formatImports(): string {
    const imports: string[] = []

    // Standard library imports
    if (this.standardLibImports.size > 0) {
      const stdImports = Array.from(this.standardLibImports).sort()
      imports.push(...stdImports)
    }

    // Typing imports
    if (this.typingImports.size > 0) {
      const typingList = Array.from(this.typingImports).sort()
      imports.push(`from typing import ${typingList.join(', ')}`)
    }

    // Add blank line between standard and third-party
    if (imports.length > 0 && this.thirdPartyImports.size > 0) {
      imports.push('')
    }

    // Third-party imports
    if (this.thirdPartyImports.size > 0) {
      const thirdParty = Array.from(this.thirdPartyImports).sort()
      imports.push(...thirdParty)
    }

    return imports.join('\n')
  }

  generateMinimal(): string {
    // Generate minimal imports for simple use cases
    return `from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, validator`
  }

  generateForJSON(hasOptional: boolean = false, hasDatetime: boolean = false): string {
    const imports: string[] = []

    if (hasDatetime) {
      imports.push('from datetime import datetime')
    }

    const typingImports = ['Dict', 'Any']
    if (hasOptional) {
      typingImports.push('Optional')
    }
    imports.push(`from typing import ${typingImports.join(', ')}`)

    imports.push('')
    imports.push('import json')
    imports.push('from pydantic import BaseModel, Field')

    return imports.join('\n')
  }
}