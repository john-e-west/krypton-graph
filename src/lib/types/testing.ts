import type { ValidationError } from './ontology'

export interface TestEntity {
  id: string
  entityTypeId: string
  entityTypeName: string
  data: Record<string, any>
  validation: {
    isValid: boolean
    errors: ValidationError[]
  }
  metadata: {
    createdAt: Date
    createdBy: string
    isTestData: true
    testSetId?: string
  }
}

export interface TestEdge {
  id: string
  edgeTypeId: string
  edgeTypeName: string
  sourceEntityId: string
  targetEntityId: string
  attributes: Record<string, any>
  validation: {
    isValid: boolean
    errors: ValidationError[]
  }
}

export interface TestDataSet {
  id: string
  name: string
  ontologyId: string
  entities: TestEntity[]
  edges: TestEdge[]
  sampleTexts: SampleText[]
  metadata: {
    createdAt: Date
    purpose: string
    validationStatus: 'passed' | 'failed' | 'partial'
  }
}

export interface SampleText {
  id: string
  text: string
  entityReferences: EntityReference[]
  edgeReferences: EdgeReference[]
  template?: string
}

export interface EntityReference {
  entityId: string
  startPos: number
  endPos: number
  fieldRef?: string
}

export interface EdgeReference {
  edgeId: string
  startPos: number
  endPos: number
  format?: string
}

export interface CSVImportConfig {
  file: File
  entityType: string
  mappings: ColumnMapping[]
  options: {
    skipHeader: boolean
    delimiter: ',' | ';' | '\t'
    dateFormat?: string
    numberFormat?: 'US' | 'EU'
    encoding: 'UTF-8' | 'ISO-8859-1'
  }
}

export interface ColumnMapping {
  csvColumn: string | number
  entityField: string
  transform?: (value: string) => any
}

export interface TextTemplate {
  template: string
  entityPlaceholders: EntityPlaceholder[]
  edgePlaceholders: EdgePlaceholder[]
}

export interface EntityPlaceholder {
  placeholder: string  // e.g., "{person1}"
  entityType: string
  fieldRef?: string    // e.g., "first_name"
}

export interface EdgePlaceholder {
  placeholder: string  // e.g., "{employment}"
  edgeType: string
  format?: string      // e.g., "works at"
}

export interface ValidationReport {
  testSetId: string
  timestamp: Date
  summary: {
    totalEntities: number
    validEntities: number
    invalidEntities: number
    totalEdges: number
    validEdges: number
    invalidEdges: number
  }
  entityValidation: EntityValidationResult[]
  edgeValidation: EdgeValidationResult[]
  recommendations: string[]
}

export interface EntityValidationResult {
  entityId: string
  entityType: string
  isValid: boolean
  errors: {
    field: string
    value: any
    error: string
    constraint: string
  }[]
}

export interface EdgeValidationResult {
  edgeId: string
  edgeType: string
  isValid: boolean
  errors: {
    field: string
    value: any
    error: string
    constraint: string
  }[]
}