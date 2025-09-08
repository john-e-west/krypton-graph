import { cloneBeforeModify } from '../decorators/clone-before-modify.decorator'
import { graphCloneService } from './graph-clone.service'

export interface Entity {
  id: string
  type: string
  name: string
  attributes: Record<string, any>
}

export interface Edge {
  id: string
  fromEntityId: string
  toEntityId: string
  type: string
  properties: Record<string, any>
}

export class GraphOperations {
  @cloneBeforeModify
  async addEntity(graphId: string, entity: Entity): Promise<any> {
    console.log(`Adding entity to graph ${graphId}:`, entity)
    
    return {
      success: true,
      entityId: entity.id,
      graphId
    }
  }
  
  @cloneBeforeModify
  async updateEntity(graphId: string, entityId: string, updates: Partial<Entity>): Promise<any> {
    console.log(`Updating entity ${entityId} in graph ${graphId}:`, updates)
    
    return {
      success: true,
      entityId,
      graphId,
      updates
    }
  }
  
  @cloneBeforeModify
  async deleteEntity(graphId: string, entityId: string): Promise<any> {
    console.log(`Deleting entity ${entityId} from graph ${graphId}`)
    
    return {
      success: true,
      entityId,
      graphId
    }
  }
  
  @cloneBeforeModify
  async addEdge(graphId: string, edge: Edge): Promise<any> {
    console.log(`Adding edge to graph ${graphId}:`, edge)
    
    return {
      success: true,
      edgeId: edge.id,
      graphId
    }
  }
  
  @cloneBeforeModify
  async updateEdge(graphId: string, edgeId: string, updates: Partial<Edge>): Promise<any> {
    console.log(`Updating edge ${edgeId} in graph ${graphId}:`, updates)
    
    return {
      success: true,
      edgeId,
      graphId,
      updates
    }
  }
  
  @cloneBeforeModify
  async deleteEdge(graphId: string, edgeId: string): Promise<any> {
    console.log(`Deleting edge ${edgeId} from graph ${graphId}`)
    
    return {
      success: true,
      edgeId,
      graphId
    }
  }
  
  @cloneBeforeModify
  async bulkAddEntities(graphId: string, entities: Entity[]): Promise<any> {
    console.log(`Bulk adding ${entities.length} entities to graph ${graphId}`)
    
    return {
      success: true,
      count: entities.length,
      graphId
    }
  }
  
  @cloneBeforeModify
  async bulkAddEdges(graphId: string, edges: Edge[]): Promise<any> {
    console.log(`Bulk adding ${edges.length} edges to graph ${graphId}`)
    
    return {
      success: true,
      count: edges.length,
      graphId
    }
  }
  
  async acceptClone(cloneId: string): Promise<void> {
    await graphCloneService.commitClone(cloneId)
  }
  
  async rejectClone(cloneId: string): Promise<void> {
    await graphCloneService.rejectClone(cloneId)
  }
  
  async getActiveCloneForGraph(graphId: string) {
    return await graphCloneService.getActiveClone(graphId)
  }
}

export const graphOperations = new GraphOperations()