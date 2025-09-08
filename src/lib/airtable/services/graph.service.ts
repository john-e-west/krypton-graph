import { BaseAirtableService } from './base.service'
import { AirtableClient } from '../client'
import { GraphRecord, CreateRecordData, UpdateRecordData } from '../../types/airtable'
import { KnowledgeGraph, GraphStatistics } from '../../types/graph'

export class GraphService extends BaseAirtableService<'Graphs'> {
  constructor(client: AirtableClient) {
    super(client, 'Graphs')
  }

  async createGraph(data: Partial<GraphRecord['fields']>): Promise<GraphRecord> {
    const graphData: CreateRecordData<'Graphs'> = {
      fields: {
        ...data,
        Status: data.Status || 'active',
        IsActive: true,
        IsArchived: false,
        EntityCount: 0,
        EdgeCount: 0,
        DocumentCount: 0,
        CreatedBy: 'current_user',
        LastModifiedBy: 'current_user'
      }
    }
    return this.create(graphData)
  }

  async getActiveGraphs(): Promise<GraphRecord[]> {
    return this.findAll({
      filterByFormula: "AND({IsActive} = TRUE(), {IsArchived} = FALSE())",
      sort: [{ field: 'Name', direction: 'asc' }]
    })
  }

  async getArchivedGraphs(): Promise<GraphRecord[]> {
    return this.findAll({
      filterByFormula: "{IsArchived} = TRUE()",
      sort: [{ field: 'Name', direction: 'asc' }]
    })
  }

  async archiveGraph(id: string): Promise<GraphRecord> {
    const updateData: UpdateRecordData<'Graphs'> = {
      fields: {
        Status: 'archived',
        IsArchived: true,
        IsActive: false,
        LastModifiedBy: 'current_user'
      }
    }
    return this.update(id, updateData)
  }

  async restoreGraph(id: string): Promise<GraphRecord> {
    const updateData: UpdateRecordData<'Graphs'> = {
      fields: {
        Status: 'active',
        IsArchived: false,
        IsActive: true,
        LastModifiedBy: 'current_user'
      }
    }
    return this.update(id, updateData)
  }

  async updateGraphStatistics(id: string, stats: Partial<GraphStatistics>): Promise<GraphRecord> {
    const updateData: UpdateRecordData<'Graphs'> = {
      fields: {
        EntityCount: stats.entityCount,
        EdgeCount: stats.edgeCount,
        DocumentCount: stats.documentCount,
        LastModifiedBy: 'current_user'
      }
    }
    return this.update(id, updateData)
  }

  async setActiveGraph(id: string): Promise<void> {
    const graphs = await this.getActiveGraphs()
    
    await Promise.all(
      graphs.map(graph => {
        if (graph.id === id) {
          return this.update(graph.id, {
            fields: { IsActive: true }
          })
        } else if (graph.fields.IsActive) {
          return this.update(graph.id, {
            fields: { IsActive: false }
          })
        }
        return Promise.resolve()
      })
    )
  }

  transformToKnowledgeGraph(record: GraphRecord): KnowledgeGraph {
    return {
      id: record.id,
      name: record.fields.Name,
      description: record.fields.Description || '',
      ontologyId: record.fields.OntologyId?.[0] || '',
      status: record.fields.Status || 'active',
      metadata: {
        createdAt: new Date(record.createdTime),
        updatedAt: new Date(record.createdTime),
        createdBy: record.fields.CreatedBy || '',
        lastModifiedBy: record.fields.LastModifiedBy || '',
        tags: record.fields.Tags || []
      },
      statistics: {
        entityCount: record.fields.EntityCount || 0,
        edgeCount: record.fields.EdgeCount || 0,
        documentCount: record.fields.DocumentCount || 0,
        sizeInBytes: 0
      },
      settings: {
        isActive: record.fields.IsActive || false,
        isPublic: record.fields.IsPublic || false,
        allowCloning: record.fields.AllowCloning || false,
        processingEnabled: record.fields.ProcessingEnabled || false
      }
    }
  }
}