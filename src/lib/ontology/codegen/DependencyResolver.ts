import { EntityDefinitionRecord, EdgeDefinitionRecord } from '../../types/airtable'

export interface DependencyNode {
  id: string
  name: string
  type: 'entity' | 'edge'
  dependencies: string[]
  record: EntityDefinitionRecord | EdgeDefinitionRecord
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: Map<string, Set<string>>
}

export class DependencyResolver {
  private graph: DependencyGraph

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map()
    }
  }

  buildGraph(
    entities: EntityDefinitionRecord[], 
    edges: EdgeDefinitionRecord[]
  ): void {
    this.graph.nodes.clear()
    this.graph.edges.clear()

    // Add all entities to the graph
    for (const entity of entities) {
      const name = entity.fields['Entity Name'] || ''
      const node: DependencyNode = {
        id: entity.id,
        name,
        type: 'entity',
        dependencies: this.extractEntityDependencies(entity),
        record: entity
      }
      this.graph.nodes.set(name, node)
      this.graph.edges.set(name, new Set())
    }

    // Add all edges to the graph
    for (const edge of edges) {
      const name = edge.fields['Edge Name'] || ''
      const node: DependencyNode = {
        id: edge.id,
        name,
        type: 'edge',
        dependencies: this.extractEdgeDependencies(edge),
        record: edge
      }
      this.graph.nodes.set(name, node)
      this.graph.edges.set(name, new Set())
    }

    // Build the dependency edges
    for (const [name, node] of this.graph.nodes) {
      for (const dep of node.dependencies) {
        if (this.graph.edges.has(dep)) {
          this.graph.edges.get(dep)!.add(name)
        }
      }
    }
  }

  private extractEntityDependencies(entity: EntityDefinitionRecord): string[] {
    const deps: string[] = []
    const propertiesJson = entity.fields['Properties JSON']
    
    if (propertiesJson) {
      try {
        const properties = JSON.parse(propertiesJson)
        if (properties.inherits) {
          deps.push(properties.inherits)
        }
        if (properties.fields) {
          for (const field of properties.fields) {
            // Check for references to other entities
            if (field.type && field.type.includes('Entity:')) {
              const refEntity = field.type.replace('Entity:', '').trim()
              deps.push(refEntity)
            }
          }
        }
      } catch {
        // Invalid JSON, no dependencies
      }
    }
    
    return deps
  }

  private extractEdgeDependencies(edge: EdgeDefinitionRecord): string[] {
    const deps: string[] = []
    
    // Edges depend on their source and target entities
    const sourceEntity = edge.fields['Source Entity']
    const targetEntity = edge.fields['Target Entity']
    
    if (sourceEntity) {
      // Handle multiple source entities
      const sources = Array.isArray(sourceEntity) ? sourceEntity : [sourceEntity]
      deps.push(...sources)
    }
    
    if (targetEntity) {
      // Handle multiple target entities
      const targets = Array.isArray(targetEntity) ? targetEntity : [targetEntity]
      deps.push(...targets)
    }
    
    return deps
  }

  detectCycles(): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const path: string[] = []

    const dfs = (node: string): void => {
      visited.add(node)
      recStack.add(node)
      path.push(node)

      const neighbors = this.graph.edges.get(node) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor)
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor)
          const cycle = path.slice(cycleStart)
          cycles.push([...cycle, neighbor])
        }
      }

      path.pop()
      recStack.delete(node)
    }

    for (const node of this.graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node)
      }
    }

    return cycles
  }

  topologicalSort(): DependencyNode[] | null {
    // Check for cycles first
    const cycles = this.detectCycles()
    if (cycles.length > 0) {
      console.warn('Circular dependencies detected:', cycles)
      // Handle cycles by breaking them intelligently
      return this.topologicalSortWithCycleBreaking(cycles)
    }

    // Standard topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>()
    const queue: string[] = []
    const result: DependencyNode[] = []

    // Initialize in-degrees
    for (const node of this.graph.nodes.keys()) {
      inDegree.set(node, 0)
    }

    // Calculate in-degrees
    for (const [_, neighbors] of this.graph.edges) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1)
      }
    }

    // Find nodes with no incoming edges
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node)
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!
      const node = this.graph.nodes.get(current)
      if (node) {
        result.push(node)
      }

      const neighbors = this.graph.edges.get(current) || new Set()
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }

    // Check if all nodes were processed
    if (result.length !== this.graph.nodes.size) {
      return null // Graph has cycles
    }

    return result
  }

  private topologicalSortWithCycleBreaking(cycles: string[][]): DependencyNode[] {
    // Strategy: Break cycles by identifying and removing problematic edges
    // Prioritize keeping entity->entity dependencies over edge dependencies
    const edgesToBreak = new Set<string>()

    for (const cycle of cycles) {
      // Find the weakest link in the cycle (prefer breaking edge dependencies)
      let breakTarget: string | null = null
      
      for (const nodeName of cycle) {
        const node = this.graph.nodes.get(nodeName)
        if (node && node.type === 'edge') {
          breakTarget = nodeName
          break
        }
      }

      // If no edge found, break the last dependency in the cycle
      if (!breakTarget && cycle.length > 1) {
        breakTarget = cycle[cycle.length - 2]
      }

      if (breakTarget) {
        edgesToBreak.add(breakTarget)
      }
    }

    // Create a modified graph without the problematic edges
    const modifiedEdges = new Map<string, Set<string>>()
    for (const [node, neighbors] of this.graph.edges) {
      if (!edgesToBreak.has(node)) {
        modifiedEdges.set(node, new Set(neighbors))
      } else {
        modifiedEdges.set(node, new Set())
      }
    }

    // Perform topological sort on the modified graph
    const originalEdges = this.graph.edges
    this.graph.edges = modifiedEdges
    const result = this.topologicalSort()
    this.graph.edges = originalEdges

    return result || []
  }

  getOrderedDefinitions(): {
    entities: EntityDefinitionRecord[]
    edges: EdgeDefinitionRecord[]
  } {
    const sorted = this.topologicalSort()
    if (!sorted) {
      // Fallback to original order if sorting fails
      console.warn('Failed to sort definitions, using original order')
      return {
        entities: Array.from(this.graph.nodes.values())
          .filter(n => n.type === 'entity')
          .map(n => n.record as EntityDefinitionRecord),
        edges: Array.from(this.graph.nodes.values())
          .filter(n => n.type === 'edge')
          .map(n => n.record as EdgeDefinitionRecord)
      }
    }

    const entities: EntityDefinitionRecord[] = []
    const edges: EdgeDefinitionRecord[] = []

    for (const node of sorted) {
      if (node.type === 'entity') {
        entities.push(node.record as EntityDefinitionRecord)
      } else {
        edges.push(node.record as EdgeDefinitionRecord)
      }
    }

    return { entities, edges }
  }
}