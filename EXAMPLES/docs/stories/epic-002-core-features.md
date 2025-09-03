# Epic 002: Core Ontology Management Features
**Epic ID:** CORE-EPIC-002  
**Duration:** 3 days  
**Priority:** P0 - Critical Path  
**Type:** Core Functionality  
**Dependencies:** SETUP-EPIC-001  

## Epic Goal
Implement the core ontology management system with full CRUD operations for ontologies, entities, and edges, integrated with Zep's knowledge graph capabilities to demonstrate the POC's primary value proposition.

## Epic Description

**Feature Context:**
- Core business logic for ontology management
- Direct integration with Zep for knowledge graph persistence
- Real-time updates via Convex subscriptions
- Foundation for all other features

**Core Capabilities:**
- Complete ontology lifecycle management
- Entity and edge definition with properties
- Bidirectional sync with Zep knowledge graphs
- Data validation and consistency checks
- Basic search and filtering

**Success Criteria:**
- Users can create, read, update, delete ontologies
- Entities and edges are properly associated with ontologies
- Changes persist to both Convex and Zep
- Real-time updates work across sessions
- Data integrity maintained

## User Stories

### Story 1: Ontology CRUD Operations (CORE-001)
**Points:** 5  
**Description:** Implement complete ontology management with Convex mutations and queries, including status tracking and metadata.

**Acceptance Criteria:**
- [ ] Create ontology with name, domain, and metadata
- [ ] List all ontologies with filtering by status
- [ ] Update ontology properties and status
- [ ] Delete ontology with cascade handling
- [ ] Real-time updates when ontologies change
- [ ] Input validation and error handling

**Technical Details:**
```typescript
// Core ontology operations
- createOntology(name, domain, description)
- listOntologies(filter?: {status?, domain?})
- updateOntology(id, updates)
- deleteOntology(id, cascade: boolean)
- getOntologyById(id)
```

### Story 2: Entity and Edge Management (CORE-002)
**Points:** 8  
**Description:** Build comprehensive entity and edge definition system with property management and relationship validation.

**Acceptance Criteria:**
- [ ] Create entities with type and custom properties
- [ ] Define edges with source/target validation
- [ ] Update entity/edge properties dynamically
- [ ] Delete with referential integrity checks
- [ ] Bulk operations for efficiency
- [ ] Property schema validation

**Technical Details:**
```typescript
// Entity operations
- createEntity(ontologyId, name, type, properties)
- updateEntityProperties(id, properties)
- listEntitiesByOntology(ontologyId)

// Edge operations  
- createEdge(ontologyId, name, sourceType, targetType)
- validateEdgeRelationship(edge)
- listEdgesByOntology(ontologyId)
```

### Story 3: Zep Knowledge Graph Integration (CORE-003)
**Points:** 8  
**Description:** Implement bidirectional synchronization between Convex data model and Zep knowledge graphs.

**Acceptance Criteria:**
- [ ] Push ontology structure to Zep graph
- [ ] Create Zep nodes for entities
- [ ] Create Zep edges for relationships
- [ ] Handle Zep API errors gracefully
- [ ] Sync status tracking and retry logic
- [ ] Batch operations for performance

**Technical Details:**
```typescript
// Zep sync operations
- syncOntologyToZep(ontologyId)
- createZepGraph(ontology)
- updateZepNodes(entities)
- updateZepEdges(edges)
- getZepSyncStatus(ontologyId)
- retryFailedSync(ontologyId)
```

## Technical Requirements

**Convex Functions:**
- Mutations for all write operations
- Queries for read operations
- Actions for Zep API calls
- Validators for data integrity

**Data Model Integrity:**
- Foreign key relationships enforced
- Cascade delete rules defined
- Property type validation
- Unique constraints where needed

**Performance Targets:**
- Ontology operations < 100ms
- Entity/edge operations < 200ms
- Zep sync < 2 seconds
- Real-time updates < 50ms

## Dependencies
- SETUP-EPIC-001 completed
- Zep API documentation
- Convex schema deployed
- TypeScript types defined

## Risk Mitigation

**Primary Risk:** Zep API latency or failures  
**Mitigation:** Queue sync operations with retry logic, show sync status in UI  
**Secondary Risk:** Data consistency between Convex and Zep  
**Mitigation:** Transaction-like patterns, sync verification endpoint  

## Definition of Done

- [ ] All 3 stories completed with tests
- [ ] Convex functions deployed and working
- [ ] Zep integration verified with test data
- [ ] Error handling for all edge cases
- [ ] Performance meets targets
- [ ] API documentation completed
- [ ] Real-time subscriptions verified

## Notes
This epic represents the core value of the POC. Focus on reliability and data integrity over UI polish. The Zep integration is critical - if blocked, implement with mock data but maintain the interface contract.

---
**Status:** Ready for Sprint Planning  
**Created:** September 1, 2025  
**Sprint:** Week 1 (Days 3-5)