// ============================================================================
// Airtable Services - Main Export
// Provides easy access to all service instances
// ============================================================================

import { airtableClient } from '../client'
import { BaseAirtableService } from './base.service'
import { OntologyService } from './ontology.service'
import { EntityService } from './entity.service'
import { EdgeService } from './edge.service'
import { TestDatasetService, TestRunService } from './test.service'
import { AirtableStagingService } from './staging.service'
import { GraphService } from './graph.service'

// Export service classes
export { BaseAirtableService }
export { OntologyService }
export { EntityService }
export { EdgeService }
export { TestDatasetService }
export { TestRunService }
export { AirtableStagingService }
export { GraphService }

// Export service instances (singletons using the default client)
export const ontologyService = new OntologyService(airtableClient)
export const entityService = new EntityService(airtableClient)
export const edgeService = new EdgeService(airtableClient)
export const testDatasetService = new TestDatasetService(airtableClient)
export const testRunService = new TestRunService(airtableClient)
export const stagingService = new AirtableStagingService(airtableClient)
export const graphService = new GraphService(airtableClient)

// Service factory for custom client configurations
export class AirtableServiceFactory {
  constructor(private client: any) {} // Using any since we might have MCP client here

  createOntologyService(): OntologyService {
    return new OntologyService(this.client)
  }

  createEntityService(): EntityService {
    return new EntityService(this.client)
  }

  createEdgeService(): EdgeService {
    return new EdgeService(this.client)
  }

  createTestDatasetService(): TestDatasetService {
    return new TestDatasetService(this.client)
  }

  createTestRunService(): TestRunService {
    return new TestRunService(this.client)
  }

  createStagingService(): AirtableStagingService {
    return new AirtableStagingService(this.client)
  }

  createGraphService(): GraphService {
    return new GraphService(this.client)
  }

  getAllServices() {
    return {
      ontologyService: this.createOntologyService(),
      entityService: this.createEntityService(),
      edgeService: this.createEdgeService(),
      testDatasetService: this.createTestDatasetService(),
      testRunService: this.createTestRunService(),
      stagingService: this.createStagingService(),
      graphService: this.createGraphService()
    }
  }
}

// Default service collection
export const airtableServices = {
  ontologyService,
  entityService,
  edgeService,
  testDatasetService,
  testRunService,
  stagingService,
  graphService,
  client: airtableClient
}

// Utility function to check if all services are ready
export function checkServiceHealth(): {
  ready: boolean
  client: {
    configured: boolean
    rateLimitStats: any
  }
  services: string[]
} {
  const clientReady = airtableClient.isReady()
  const config = airtableClient.getConfig()
  
  return {
    ready: clientReady,
    client: {
      configured: config.hasApiKey && config.hasBaseId,
      rateLimitStats: config.rateLimitStats
    },
    services: [
      'OntologyService',
      'EntityService', 
      'EdgeService',
      'TestDatasetService',
      'TestRunService',
      'StagingService',
      'GraphService'
    ]
  }
}

// Export types for convenience
export type * from '../../types/airtable'