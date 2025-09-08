import { describe, it, expect, beforeEach } from 'vitest'
import { DependencyResolver } from '../DependencyResolver'
import { EntityDefinitionRecord, EdgeDefinitionRecord } from '../../../types/airtable'

describe('DependencyResolver', () => {
  let resolver: DependencyResolver

  beforeEach(() => {
    resolver = new DependencyResolver()
  })

  describe('buildGraph', () => {
    it('should build dependency graph for entities', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'Person',
            'Properties JSON': JSON.stringify({
              fields: [
                { name: 'name', type: 'str' }
              ]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Employee',
            'Properties JSON': JSON.stringify({
              inherits: 'Person',
              fields: [
                { name: 'employeeId', type: 'str' }
              ]
            })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const ordered = resolver.getOrderedDefinitions()
      
      expect(ordered.entities).toHaveLength(2)
      expect(ordered.entities[0].fields['Entity Name']).toBe('Person')
      expect(ordered.entities[1].fields['Entity Name']).toBe('Employee')
    })

    it('should handle entity references in fields', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'Company',
            'Properties JSON': JSON.stringify({
              fields: [
                { name: 'name', type: 'str' }
              ]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Person',
            'Properties JSON': JSON.stringify({
              fields: [
                { name: 'name', type: 'str' },
                { name: 'employer', type: 'Entity:Company' }
              ]
            })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const ordered = resolver.getOrderedDefinitions()
      
      expect(ordered.entities[0].fields['Entity Name']).toBe('Company')
      expect(ordered.entities[1].fields['Entity Name']).toBe('Person')
    })

    it('should handle edge dependencies on entities', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'Person',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Company',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord
      ]

      const edges: EdgeDefinitionRecord[] = [
        {
          id: 'edge1',
          fields: {
            'Edge Name': 'Employment',
            'Source Entity': 'Person',
            'Target Entity': 'Company',
            'Properties JSON': '{}'
          }
        } as EdgeDefinitionRecord
      ]

      resolver.buildGraph(entities, edges)
      const ordered = resolver.getOrderedDefinitions()
      
      expect(ordered.entities).toHaveLength(2)
      expect(ordered.edges).toHaveLength(1)
      // Entities should come before edges that depend on them
      expect(ordered.edges[0].fields['Edge Name']).toBe('Employment')
    })
  })

  describe('detectCycles', () => {
    it('should detect simple circular dependency', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'A',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'b', type: 'Entity:B' }]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'B',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'a', type: 'Entity:A' }]
            })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const cycles = resolver.detectCycles()
      
      expect(cycles.length).toBeGreaterThan(0)
    })

    it('should detect complex circular dependency', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'A',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'b', type: 'Entity:B' }]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'B',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'c', type: 'Entity:C' }]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e3',
          fields: {
            'Entity Name': 'C',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'a', type: 'Entity:A' }]
            })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const cycles = resolver.detectCycles()
      
      expect(cycles.length).toBeGreaterThan(0)
    })

    it('should handle no cycles', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'A',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'B',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'a', type: 'Entity:A' }]
            })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const cycles = resolver.detectCycles()
      
      expect(cycles).toHaveLength(0)
    })
  })

  describe('topologicalSort', () => {
    it('should sort entities in dependency order', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'GrandChild',
            'Properties JSON': JSON.stringify({ inherits: 'Child' })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Parent',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e3',
          fields: {
            'Entity Name': 'Child',
            'Properties JSON': JSON.stringify({ inherits: 'Parent' })
          }
        } as EntityDefinitionRecord
      ]

      resolver.buildGraph(entities, [])
      const sorted = resolver.topologicalSort()
      
      expect(sorted).not.toBeNull()
      expect(sorted!).toHaveLength(3)
      
      const names = sorted!.map(n => n.name)
      const parentIndex = names.indexOf('Parent')
      const childIndex = names.indexOf('Child')
      const grandChildIndex = names.indexOf('GrandChild')
      
      expect(parentIndex).toBeLessThan(childIndex)
      expect(childIndex).toBeLessThan(grandChildIndex)
    })

    it('should handle circular dependencies with cycle breaking', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'A',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'b', type: 'Entity:B' }]
            })
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'B',
            'Properties JSON': JSON.stringify({
              fields: [{ name: 'a', type: 'Entity:A' }]
            })
          }
        } as EntityDefinitionRecord
      ]

      const edges: EdgeDefinitionRecord[] = [
        {
          id: 'edge1',
          fields: {
            'Edge Name': 'Connection',
            'Source Entity': 'A',
            'Target Entity': 'B',
            'Properties JSON': '{}'
          }
        } as EdgeDefinitionRecord
      ]

      resolver.buildGraph(entities, edges)
      const sorted = resolver.topologicalSort()
      
      // Should still return a result even with cycles
      expect(sorted).not.toBeNull()
      expect(sorted!.length).toBeGreaterThan(0)
    })
  })

  describe('getOrderedDefinitions', () => {
    it('should separate entities and edges correctly', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'Person',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Company',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord
      ]

      const edges: EdgeDefinitionRecord[] = [
        {
          id: 'edge1',
          fields: {
            'Edge Name': 'Employment',
            'Source Entity': 'Person',
            'Target Entity': 'Company',
            'Properties JSON': '{}'
          }
        } as EdgeDefinitionRecord,
        {
          id: 'edge2',
          fields: {
            'Edge Name': 'Partnership',
            'Source Entity': 'Company',
            'Target Entity': 'Company',
            'Properties JSON': '{}'
          }
        } as EdgeDefinitionRecord
      ]

      resolver.buildGraph(entities, edges)
      const ordered = resolver.getOrderedDefinitions()
      
      expect(ordered.entities).toHaveLength(2)
      expect(ordered.edges).toHaveLength(2)
      expect(ordered.entities.every(e => e.fields['Entity Name'])).toBeTruthy()
      expect(ordered.edges.every(e => e.fields['Edge Name'])).toBeTruthy()
    })

    it('should handle multiple source/target entities for edges', () => {
      const entities: EntityDefinitionRecord[] = [
        {
          id: 'e1',
          fields: {
            'Entity Name': 'Person',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e2',
          fields: {
            'Entity Name': 'Company',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord,
        {
          id: 'e3',
          fields: {
            'Entity Name': 'Organization',
            'Properties JSON': '{}'
          }
        } as EntityDefinitionRecord
      ]

      const edges: EdgeDefinitionRecord[] = [
        {
          id: 'edge1',
          fields: {
            'Edge Name': 'Membership',
            'Source Entity': ['Person', 'Company'],
            'Target Entity': 'Organization',
            'Properties JSON': '{}'
          }
        } as EdgeDefinitionRecord
      ]

      resolver.buildGraph(entities, edges)
      const ordered = resolver.getOrderedDefinitions()
      
      expect(ordered.entities).toHaveLength(3)
      expect(ordered.edges).toHaveLength(1)
    })
  })
})