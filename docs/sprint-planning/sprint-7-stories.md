# Sprint 7 User Stories - Core Document Analysis

**Sprint Goal**: Implement document upload and AI analysis pipeline for automatic ontology discovery

**Sprint Duration**: 2 weeks  
**Story Points Total**: 21  
**Team Capacity**: 2 developers

---

## Story 7.1: Multi-Format Document Upload Infrastructure

### User Story
As a **knowledge graph user**,  
I want to **upload documents in various formats (PDF, DOCX, MD, TXT)**,  
So that **I can analyze any type of document without format conversion**.

### Story Context

**Existing System Integration:**
- Integrates with: Current document upload service
- Technology: React/TypeScript frontend, Node.js backend
- Follows pattern: Existing file upload patterns from Sprint 2
- Touch points: Document storage service, authentication system

### Acceptance Criteria

**Functional Requirements:**
1. System accepts PDF, DOCX, MD, and TXT file formats
2. Maximum file size of 10MB enforced with clear user messaging
3. File validation occurs client-side and server-side
4. Upload progress displayed with percentage and time remaining
5. Multiple files can be queued for sequential processing

**Integration Requirements:**
6. Existing document list view shows newly uploaded documents
7. Current authentication/authorization rules apply
8. Document storage follows existing patterns
9. Upload errors follow existing error handling patterns

**Quality Requirements:**
10. Upload completes within 10 seconds for 10MB file
11. Graceful error handling for unsupported formats
12. Accessibility standards met (WCAG 2.1 AA)

### Technical Notes
- **Libraries**: Use existing multer configuration, add file-type validation
- **Storage**: Follow existing Airtable document storage pattern
- **Progress**: Implement WebSocket for real-time progress updates
- **Security**: Virus scanning through existing ClamAV integration

### Story Points: 5
### Priority: P0 (Critical)
### Dependencies: None

---

## Story 7.2: Document Analysis Service with OpenAI Integration

### User Story
As a **knowledge graph user**,  
I want the **system to automatically analyze my document content**,  
So that **I can receive intelligent type suggestions without manual analysis**.

### Story Context

**Existing System Integration:**
- Integrates with: OpenAI API service wrapper from Sprint 3
- Technology: Node.js service, GPT-4 API
- Follows pattern: Existing AI service patterns
- Touch points: Document storage, queue system

### Acceptance Criteria

**Functional Requirements:**
1. Document content extracted accurately from all supported formats
2. Content chunked appropriately for OpenAI API limits (8K tokens)
3. Analysis identifies key entities, relationships, and patterns
4. Results include confidence scores for identified patterns
5. Analysis completes within 30 seconds for typical documents

**Integration Requirements:**
6. Uses existing OpenAI API key management
7. Follows existing retry logic for API failures
8. Results stored in existing data schema
9. Queue system prevents concurrent analysis overload

**Quality Requirements:**
10. 95% accuracy in entity extraction (measured against test set)
11. Graceful degradation if OpenAI unavailable
12. Cost tracking per analysis for billing

### Technical Notes
- **Chunking Strategy**: Sliding window with 500 token overlap
- **Prompt Engineering**: Use few-shot learning with domain examples
- **Caching**: Cache analysis results by document hash
- **Rate Limiting**: Respect OpenAI rate limits (10 req/min)

### Story Points: 8
### Priority: P0 (Critical)
### Dependencies: Story 7.1

---

## Story 7.3: AI-Powered Type Suggestion Engine

### User Story
As a **knowledge graph user**,  
I want to **receive AI-generated custom type suggestions**,  
So that **I can quickly create an effective ontology without expertise**.

### Story Context

**Existing System Integration:**
- Integrates with: Zep v3 type system from Sprint 4
- Technology: Node.js, OpenAI GPT-4
- Follows pattern: Existing type management patterns
- Touch points: Type validation service, ontology storage

### Acceptance Criteria

**Functional Requirements:**
1. Generates 5-10 custom entity type suggestions per document
2. Generates 5-10 custom edge type suggestions per document
3. Each suggestion includes name, description, and examples
4. Suggestions respect Zep v3 10-type limits
5. Suggestions ranked by expected classification coverage

**Integration Requirements:**
6. Suggestions compatible with existing type schema
7. Validates against Zep v3 type constraints
8. Integrates with existing ontology storage
9. Follows existing naming conventions

**Quality Requirements:**
10. Suggestions achieve >80% classification on first try
11. Response time <5 seconds after analysis complete
12. Clear explanations for each suggestion

### Technical Notes
- **Prompt Template**: Include Zep constraints in system prompt
- **Ranking Algorithm**: Coverage estimation based on document frequency
- **Validation**: Real-time validation against Zep API
- **Examples**: Extract 3-5 examples per type from document

### Story Points: 5
### Priority: P0 (Critical)
### Dependencies: Story 7.2

---

## Story 7.4: Real-Time Analysis Progress UI

### User Story
As a **knowledge graph user**,  
I want to **see real-time progress during document analysis**,  
So that **I understand what's happening and how long it will take**.

### Story Context

**Existing System Integration:**
- Integrates with: Existing React UI components
- Technology: React, TypeScript, WebSockets, shadcn/ui
- Follows pattern: Current loading/progress patterns
- Touch points: Document analysis service, WebSocket server

### Acceptance Criteria

**Functional Requirements:**
1. Progress bar shows overall completion percentage
2. Current step displayed (Upload → Extract → Analyze → Suggest)
3. Estimated time remaining shown and updates dynamically
4. Can run in background while user continues working
5. Notification when analysis complete

**Integration Requirements:**
6. Uses existing WebSocket infrastructure
7. Follows current UI component library (shadcn/ui)
8. Integrates with existing notification system
9. Maintains current responsive design standards

**Quality Requirements:**
10. Updates at least every 2 seconds
11. Accurate time estimates (±20%)
12. No UI blocking during analysis

### Technical Notes
- **WebSocket Events**: progress, step-change, complete, error
- **State Management**: Use existing Redux patterns
- **Components**: Extend existing ProgressBar component
- **Background**: Use Web Workers for non-blocking updates

### Story Points: 3
### Priority: P1 (High)
### Dependencies: Stories 7.1, 7.2

---

## Story 7.5: Analysis Result Caching System (Technical Debt)

### User Story
As a **system administrator**,  
I want **document analysis results to be cached**,  
So that **repeated analyses are instant and API costs are reduced**.

### Story Context

**Existing System Integration:**
- Integrates with: Redis cache from Sprint 3
- Technology: Redis, Node.js
- Follows pattern: Existing caching patterns
- Touch points: Document analysis service, API layer

### Acceptance Criteria

**Functional Requirements:**
1. Cache keyed by document hash + analysis version
2. TTL of 7 days for analysis results
3. Cache invalidation on document update
4. Cache hit rate >60% after warm-up period

**Integration Requirements:**
5. Uses existing Redis connection pool
6. Follows current cache key naming conventions
7. Integrates with existing cache monitoring
8. Respects memory limits (max 1GB for analysis cache)

**Quality Requirements:**
9. Cache retrieval <100ms
10. No data inconsistency issues
11. Graceful degradation if cache unavailable

### Technical Notes
- **Key Strategy**: `analysis:v1:{sha256_hash}`
- **Compression**: Use gzip for large results
- **Monitoring**: Track hit/miss rates in DataDog
- **Fallback**: Direct API call if cache miss

### Story Points: 2
### Priority: P2 (Medium)
### Dependencies: Story 7.2

---

## Sprint 7 Summary

### Velocity Metrics
- **Total Story Points**: 21
- **Critical Stories**: 7.1, 7.2, 7.3 (18 points)
- **High Priority**: 7.4 (3 points)
- **Technical Debt**: 7.5 (2 points)

### Dependencies Chain
1. Story 7.1 (Upload) → Enables all other stories
2. Story 7.2 (Analysis) → Enables 7.3 and 7.5
3. Story 7.3 (Suggestions) → Core value delivery
4. Story 7.4 (UI) → Enhances 7.1 and 7.2
5. Story 7.5 (Cache) → Optimizes 7.2

### Definition of Done for Sprint 7
- [ ] All P0 stories completed and tested
- [ ] Integration tests passing
- [ ] Performance benchmarks met (<30s analysis)
- [ ] Documentation updated
- [ ] Demo prepared for stakeholders
- [ ] No regression in existing functionality

### Risks & Mitigations
1. **OpenAI API Reliability**: Implement retry logic and fallback patterns
2. **Document Parsing Complexity**: Use proven libraries (pdf-parse, mammoth)
3. **Performance at Scale**: Implement queuing and rate limiting early
4. **Cost Management**: Monitor API usage closely, implement caps

---

**Prepared by**: John (Product Manager)  
**Date**: September 7, 2025  
**Status**: Ready for Sprint Planning