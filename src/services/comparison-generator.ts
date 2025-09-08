import { 
  ComparisonView, 
  DiffResult, 
  GraphSnapshot, 
  Highlight 
} from '../types/review'

export class ComparisonGenerator {
  generateComparison(
    current: GraphSnapshot,
    proposed: GraphSnapshot
  ): ComparisonView {
    const diff = this.calculateDiff(current, proposed)
    
    return {
      left: {
        title: 'Current State',
        data: current,
        highlights: this.generateHighlights(diff, 'removed')
      },
      right: {
        title: 'Proposed State',
        data: proposed,
        highlights: this.generateHighlights(diff, 'added')
      },
      diff
    }
  }
  
  private calculateDiff(
    current: GraphSnapshot,
    proposed: GraphSnapshot
  ): DiffResult {
    const added: any[] = []
    const removed: any[] = []
    const modified: any[] = []
    
    // Compare entities
    const currentEntityMap = new Map(
      current.entities.map(e => [e.id, e])
    )
    const proposedEntityMap = new Map(
      proposed.entities.map(e => [e.id, e])
    )
    
    // Find removed entities
    currentEntityMap.forEach((entity, id) => {
      if (!proposedEntityMap.has(id)) {
        removed.push({
          type: 'entity',
          data: entity
        })
      }
    })
    
    // Find added and modified entities
    proposedEntityMap.forEach((entity, id) => {
      const currentEntity = currentEntityMap.get(id)
      if (!currentEntity) {
        added.push({
          type: 'entity',
          data: entity
        })
      } else if (!this.deepEqual(currentEntity, entity)) {
        modified.push({
          type: 'entity',
          before: currentEntity,
          after: entity,
          changes: this.findPropertyChanges(currentEntity, entity)
        })
      }
    })
    
    // Compare edges
    const currentEdgeMap = new Map(
      current.edges.map(e => [e.id, e])
    )
    const proposedEdgeMap = new Map(
      proposed.edges.map(e => [e.id, e])
    )
    
    // Find removed edges
    currentEdgeMap.forEach((edge, id) => {
      if (!proposedEdgeMap.has(id)) {
        removed.push({
          type: 'edge',
          data: edge
        })
      }
    })
    
    // Find added and modified edges
    proposedEdgeMap.forEach((edge, id) => {
      const currentEdge = currentEdgeMap.get(id)
      if (!currentEdge) {
        added.push({
          type: 'edge',
          data: edge
        })
      } else if (!this.deepEqual(currentEdge, edge)) {
        modified.push({
          type: 'edge',
          before: currentEdge,
          after: edge,
          changes: this.findPropertyChanges(currentEdge, edge)
        })
      }
    })
    
    return { added, removed, modified }
  }
  
  private generateHighlights(diff: DiffResult, type: 'added' | 'removed'): Highlight[] {
    const highlights: Highlight[] = []
    
    if (type === 'added') {
      diff.added.forEach(item => {
        highlights.push({
          path: `${item.type}.${item.data.id}`,
          type: 'added'
        })
      })
      diff.modified.forEach(item => {
        item.changes?.forEach((change: any) => {
          highlights.push({
            path: `${item.type}.${item.after.id}.${change.property}`,
            type: 'modified'
          })
        })
      })
    } else {
      diff.removed.forEach(item => {
        highlights.push({
          path: `${item.type}.${item.data.id}`,
          type: 'removed'
        })
      })
      diff.modified.forEach(item => {
        item.changes?.forEach((change: any) => {
          highlights.push({
            path: `${item.type}.${item.before.id}.${change.property}`,
            type: 'modified'
          })
        })
      })
    }
    
    return highlights
  }
  
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true
    
    if (obj1 == null || obj2 == null) return false
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2
    }
    
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)
    
    if (keys1.length !== keys2.length) return false
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false
      if (!this.deepEqual(obj1[key], obj2[key])) return false
    }
    
    return true
  }
  
  private findPropertyChanges(before: any, after: any): any[] {
    const changes: any[] = []
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    
    allKeys.forEach(key => {
      if (!(key in before)) {
        changes.push({
          property: key,
          type: 'added',
          value: after[key]
        })
      } else if (!(key in after)) {
        changes.push({
          property: key,
          type: 'removed',
          value: before[key]
        })
      } else if (!this.deepEqual(before[key], after[key])) {
        changes.push({
          property: key,
          type: 'modified',
          before: before[key],
          after: after[key]
        })
      }
    })
    
    return changes
  }
  
  formatDiffForDisplay(diff: DiffResult): string[] {
    const lines: string[] = []
    
    if (diff.added.length > 0) {
      lines.push('Added:')
      diff.added.forEach(item => {
        lines.push(`  + ${item.type}: ${item.data.id || item.data.name || 'Unknown'}`)
      })
    }
    
    if (diff.removed.length > 0) {
      if (lines.length > 0) lines.push('')
      lines.push('Removed:')
      diff.removed.forEach(item => {
        lines.push(`  - ${item.type}: ${item.data.id || item.data.name || 'Unknown'}`)
      })
    }
    
    if (diff.modified.length > 0) {
      if (lines.length > 0) lines.push('')
      lines.push('Modified:')
      diff.modified.forEach(item => {
        lines.push(`  ~ ${item.type}: ${item.before.id || item.before.name || 'Unknown'}`)
        if (item.changes) {
          item.changes.forEach((change: any) => {
            if (change.type === 'modified') {
              lines.push(`    ${change.property}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`)
            } else if (change.type === 'added') {
              lines.push(`    +${change.property}: ${JSON.stringify(change.value)}`)
            } else if (change.type === 'removed') {
              lines.push(`    -${change.property}: ${JSON.stringify(change.value)}`)
            }
          })
        }
      })
    }
    
    return lines
  }
}