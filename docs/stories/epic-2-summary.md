# Epic 2: Document Ingestion Pipeline - Summary

## Epic Overview
- **Epic Number**: 2
- **Epic Goal**: Build a complete document processing pipeline with file uploads, Docling conversion, smart chunking, and Airtable staging
- **Total Story Points**: 31 points
- **Estimated Duration**: 2-3 sprints (4-6 weeks)
- **Priority**: P0 - Must Have
- **Dependencies**: Epic 1 must be completed first

## Stories Summary

### Story 2.1: File Upload Interface
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - Drag-and-drop file upload
  - Support for PDF, TXT, MD, DOCX
  - Batch upload (up to 10 files)
  - Upload queue management
  - 50MB file size limit

### Story 2.2: Docling Integration for PDF Processing
- **Points**: 8
- **Status**: Draft
- **Key Features**:
  - Python service for Docling
  - PDF to markdown conversion
  - >95% content accuracy target
  - Image extraction and storage
  - Structure preservation

### Story 2.3: Smart Chunking Engine
- **Points**: 8
- **Status**: Draft
- **Key Features**:
  - 10,000 character limit per chunk
  - Natural boundary detection
  - 10-20% overlap strategy
  - OpenAI integration for smart boundaries
  - Manual adjustment capability

### Story 2.4: Airtable Staging Implementation
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - Episode ID tracking
  - Referential integrity across 8 tables
  - Rollback mechanism
  - Audit logging
  - Staging verification

### Story 2.5: Processing Status Dashboard
- **Points**: 5
- **Status**: Draft
- **Key Features**:
  - Real-time status updates
  - Multi-phase progress tracking
  - Processing metrics
  - CSV export
  - Historical view (last 100 documents)

## Technical Architecture

### System Flow
```
Upload → Validation → Docling Conversion → Smart Chunking → Airtable Staging → Complete
         ↓              ↓                    ↓                ↓
     [Queue Mgmt]  [Status Updates]    [Preview UI]     [Verification]
```

### Key Technologies
- **Frontend**: React, react-dropzone, WebSockets
- **Backend**: Node.js API routes, Python service
- **Processing**: Docling (Python), OpenAI API
- **Storage**: Airtable (Documents, DocumentChunks tables)
- **Monitoring**: Real-time WebSocket updates

### Data Flow
1. User uploads files through drag-and-drop interface
2. Files validated and queued for processing
3. Docling converts PDFs to markdown
4. Smart chunking creates semantic segments
5. Chunks staged in Airtable with relationships
6. Status dashboard shows real-time progress

## Implementation Strategy

### Sprint 2 (Recommended)
**Week 1:**
- Story 2.1: File Upload Interface (5 points)
- Story 2.2: Docling Integration - Start (4 points)

**Week 2:**
- Story 2.2: Docling Integration - Complete (4 points)
- Story 2.3: Smart Chunking - Start (4 points)

### Sprint 3 (Recommended)
**Week 1:**
- Story 2.3: Smart Chunking - Complete (4 points)
- Story 2.4: Airtable Staging (5 points)

**Week 2:**
- Story 2.5: Processing Status Dashboard (5 points)
- Integration testing and bug fixes

## Risk Assessment

### High Priority Risks
1. **Docling Accuracy**: May not achieve 95% accuracy for all PDF types
   - Mitigation: Implement fallback text extraction
2. **Processing Performance**: Large documents may exceed timeout
   - Mitigation: Implement chunked processing and background jobs
3. **OpenAI Rate Limits**: Smart chunking may hit API limits
   - Mitigation: Implement caching and fallback to rule-based

### Medium Priority Risks
1. **Python-Node Integration**: Communication overhead
   - Mitigation: Consider containerization or microservice
2. **Airtable Rate Limits**: 5 req/sec constraint
   - Mitigation: Batch operations and queue management

## Success Metrics
- [ ] Successfully process 95% of uploaded documents
- [ ] Average processing time < 30 seconds for 10MB file
- [ ] Smart chunking maintains semantic coherence
- [ ] Zero data loss during staging
- [ ] Real-time updates with < 500ms latency

## Integration Points

### With Epic 1 (Foundation)
- Uses Airtable service layer from Story 1.2
- Displays in Documents page from Story 1.3
- Updates dashboard metrics from Story 1.4

### With Epic 3 (Ontology Management)
- Chunks prepared for entity extraction
- Document metadata available for ontology mapping
- Episode tracking enables ontology-based processing

## Testing Requirements

### Unit Tests
- File validation logic
- Chunking algorithms
- Staging rollback mechanism
- Metrics calculations

### Integration Tests
- End-to-end document processing
- Docling service communication
- Airtable staging transactions
- WebSocket real-time updates

### Performance Tests
- 50MB file upload
- Concurrent document processing (10 files)
- Chunking of 1000+ page documents
- Dashboard with 100+ documents

## Documentation Requirements
- API documentation for upload endpoints
- Docling service setup guide
- Chunking algorithm documentation
- Troubleshooting guide for failed documents

## Next Steps
1. Review and approve all 5 stories
2. Set up Python environment for Docling
3. Obtain OpenAI API keys
4. Design document processing queue architecture
5. Plan Sprint 2 with Story 2.1 and partial 2.2

---

**Epic Status**: Draft - Ready for Review
**Created by**: Bob (Scrum Master)
**Date**: 2025-01-04
**Version**: 1.0