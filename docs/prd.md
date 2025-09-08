# Krypton Graph Product Requirements Document (PRD)

## Goals and Background Context

### Goals
• Transform disparate document sources (PDFs, Zoom transcripts, emails) into a unified, queryable knowledge graph
• Implement Anthropic's contextual retrieval methodology with intelligent chunking for optimal AI performance
• Provide complete audit trail and traceability from any knowledge graph element back to source documents
• Enable visual ontology design for custom entity and relationship definitions
• Deliver impact assessment capabilities to preview changes before committing to production graphs
• Integrate seamlessly with existing Airtable infrastructure while maintaining flexibility for future Zep integration
• Achieve >50 documents/hour processing throughput with >98% success rate
• Enable new users to import and verify their first document within 10 minutes

### Background Context

Organizations today struggle with knowledge fragmentation across multiple document repositories, losing up to 70% of potential value from their information assets. Current solutions fail to provide unified processing pipelines, context-aware chunking, and proper API constraint handling (such as Zep's 10,000 character limit). Krypton Graph addresses this challenge by creating a comprehensive knowledge graph management platform that combines document processing, ontology design, and impact assessment in a unified interface.

The system leverages an existing 8-table Airtable schema that provides excellent alignment with Zep's patterns while avoiding vendor lock-in. By implementing a clone-before-modify pattern and episode-based processing, the platform ensures zero data loss while maintaining complete traceability. The solution transforms raw documents into intelligently chunked, semantically preserved knowledge that maximizes the effectiveness of AI-powered retrieval and context engineering.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-03 | v1.0 | Initial PRD creation based on existing project brief and architecture docs | John (PM) |

## Requirements

### Functional
• FR1: The system shall support document ingestion from multiple sources including BOX folders, Zoom transcripts, and Exchange email
• FR2: The system shall convert all PDF documents to markdown using Docling with >95% accuracy retention
• FR3: The system shall implement smart chunking that respects the 10,000 character limit while preserving semantic context
• FR4: The system shall stage all document chunks in Airtable with complete referential integrity across 8 tables
• FR5: The system shall provide visual ontology design for creating entity and edge type definitions
• FR6: The system shall support episode-based processing with unique episode IDs for complete audit trails
• FR7: The system shall implement clone-before-modify pattern for all graph operations to ensure zero data loss
• FR8: The system shall provide impact assessment reports showing changes before committing to production
• FR9: The system shall integrate with Airtable via REST API or SDK with rate limiting compliance
• FR10: The system shall offer a command palette (Cmd+K) for power user navigation and actions
• FR11: The system shall enable smart chunk editing with LLM assistance for optimal knowledge extraction
• FR12: The system shall maintain bi-directional traceability between source documents and knowledge graph elements

### Non Functional
• NFR1: The system shall process documents at >50 documents/hour throughput
• NFR2: API response times shall be <200ms for standard queries
• NFR3: Graph visualization shall render 1000 nodes in <1 second
• NFR4: Page load time shall be <3 seconds on 3G connection
• NFR5: Document processing shall complete within 30 seconds for 10MB files
• NFR6: The system shall maintain 99.9% uptime with <1% error rate
• NFR7: The system shall respect Airtable's 5 requests/second rate limit
• NFR8: The system shall achieve >98% success rate for document processing
• NFR9: All UI components shall meet WCAG AA accessibility standards
• NFR10: The system shall support concurrent processing of multiple documents without blocking

## Technical Assumptions

### Repository Structure: Monorepo
Single repository containing frontend, backend services, and shared utilities. This simplifies dependency management, enables atomic commits across the stack, and aligns with single developer resource constraints. Structure follows standard conventions with /src for application code, /docs for documentation, and clear separation of concerns.

### Service Architecture
**Monolithic application with modular service layer** - Single deployable unit with well-defined service boundaries for Document Processing, Ontology Management, Graph Operations, and Airtable Integration. This approach provides simplicity for initial development while maintaining clean interfaces that could be extracted to microservices if needed. The architecture implements the ADAPT pattern, using Airtable for storage while implementing Zep-like patterns in the application layer.

### Testing Requirements
**Comprehensive testing pyramid** including:
• Unit tests for all business logic and utilities (target 80% coverage)
• Integration tests for Airtable API interactions and external services
• Component tests for React components using React Testing Library
• E2E tests for critical user workflows (document import, ontology creation)
• Manual testing convenience methods for development
• Snapshot tests for graph visualization outputs

### Additional Technical Assumptions and Requests
• **Frontend Stack**: React 18.x, TypeScript 5.x, Tailwind CSS, shadcn/ui v4 components
• **State Management**: Zustand for global state, React Query for server state
• **Build Tools**: Vite for development, optimized production builds
• **API Design**: RESTful endpoints with OpenAPI documentation
• **Data Access**: Airtable REST API or JavaScript SDK with rate limiting and retry logic
• **Authentication**: JWT-based with refresh tokens (implementation details TBD)
• **Document Processing**: Docling for PDF conversion, OpenAI API for smart chunking
• **Graph Rendering**: D3.js with Canvas/WebGL for performance
• **Form Handling**: React Hook Form with Zod validation
• **Error Handling**: Centralized error boundary with Sentry integration
• **Development Tools**: ESLint, Prettier, Husky for git hooks
• **Deployment Target**: Vercel or similar JAMstack platform
• **Environment Management**: Separate dev, staging, and production configurations
• **Version Control**: Git with conventional commits

## Epic List

• **Epic 1: Foundation & Core Infrastructure** - Establish project setup with React/TypeScript/shadcn-ui, Airtable integration layer, basic routing, and deliver initial dashboard with health check endpoints

• **Epic 2: Document Ingestion Pipeline** - Build complete document import workflow from file upload through Docling processing, implement smart chunking with 10,000 character limits, and create Airtable staging with full referential integrity

• **Epic 3: Ontology Management System** - Create visual ontology designer for entity/edge definitions, implement validation rules, enable test dataset creation, and provide CRUD operations for all ontology components

• **Epic 4: Knowledge Graph Operations** - Implement clone-before-modify pattern for safe graph manipulation, build impact assessment engine with before/after visualization, create graph explorer with D3.js, and enable accept/reject workflows

• **Epic 5: Advanced Processing & Optimization** - Add multi-source ingestion (BOX, Zoom, Exchange), implement concurrent processing queue, add command palette navigation, optimize performance for 50+ docs/hour throughput, and create comprehensive monitoring dashboard

## Epic 1: Foundation & Core Infrastructure

**Goal**: Establish the foundational application architecture with React/TypeScript/shadcn-ui setup, create the Airtable data access layer with proper rate limiting, and deliver a working dashboard that demonstrates core functionality while providing health check endpoints for monitoring.

### Story 1.1: Project Setup and Configuration
**As a** developer,
**I want** a properly configured React/TypeScript project with shadcn-ui v4,
**so that** I have a solid foundation for building all features.

**Acceptance Criteria:**
1. Vite-based React 18.x project initialized with TypeScript 5.x configuration
2. Tailwind CSS configured with shadcn-ui v4 theme and component library
3. ESLint and Prettier configured with appropriate rules for React/TypeScript
4. Git repository initialized with .gitignore and conventional commit setup
5. Environment variable management with .env files for dev/staging/prod
6. Basic folder structure established (/src/components, /services, /utils, /types)
7. README with setup instructions and development guidelines

### Story 1.2: Airtable Data Access Layer
**As a** developer,
**I want** a robust Airtable integration service,
**so that** the application can reliably interact with all 8 database tables.

**Acceptance Criteria:**
1. Airtable SDK or REST API client configured with authentication
2. Service layer with typed interfaces for all 8 tables (Ontologies, EntityDefinitions, etc.)
3. Rate limiting implementation respecting 5 requests/second limit
4. Exponential backoff retry logic for failed requests
5. Error handling with meaningful error messages
6. TypeScript types generated from Airtable schema
7. Unit tests for all CRUD operations with mocked responses

### Story 1.3: Basic Routing and Layout
**As a** user,
**I want** consistent navigation and application structure,
**so that** I can easily access different features.

**Acceptance Criteria:**
1. React Router configured with routes for Dashboard, Documents, Ontologies, Graphs
2. App shell with header, sidebar navigation, and main content area
3. Responsive layout that works on desktop (1280px+) and tablets
4. Navigation highlights current active route
5. Loading states and error boundaries for each route
6. 404 page for unmatched routes

### Story 1.4: Dashboard with System Health
**As a** user,
**I want** a dashboard showing system status and recent activity,
**so that** I can quickly understand the current state of my knowledge graphs.

**Acceptance Criteria:**
1. Dashboard displays connection status to Airtable
2. Recent activity feed showing last 10 processed documents
3. Summary cards for total documents, ontologies, and graphs
4. Health check endpoint at /api/health returning system status
5. Real-time update of connection status using polling or websockets
6. Error states displayed when services are unavailable
7. Dashboard loads in <3 seconds on 3G connection

## Epic 2: Document Ingestion Pipeline

**Goal**: Build a complete document processing pipeline that accepts file uploads, converts PDFs to markdown using Docling, implements intelligent chunking that respects the 10,000 character limit while preserving semantic context, and stages all processed content in Airtable with full referential integrity.

### Story 2.1: File Upload Interface
**As a** user,
**I want** to upload documents through a drag-and-drop interface,
**so that** I can easily import my knowledge sources into the system.

**Acceptance Criteria:**
1. Drag-and-drop zone accepting PDF, TXT, MD, and DOCX files
2. File validation for type and size (max 50MB per file)
3. Upload progress indicator with cancel option
4. Queue display for multiple file uploads
5. Error messages for invalid files with clear explanations
6. Uploaded files temporarily stored before processing
7. Support for batch upload of up to 10 files simultaneously

### Story 2.2: Docling Integration for PDF Processing
**As a** system,
**I want** to convert PDF documents to markdown using Docling,
**so that** content can be processed and chunked effectively.

**Acceptance Criteria:**
1. Docling service integrated and configured
2. PDF to markdown conversion maintaining >95% content accuracy
3. Preservation of document structure (headings, lists, tables)
4. Image extraction and storage with references in markdown
5. Error handling for corrupted or encrypted PDFs
6. Processing status updates sent to frontend
7. Conversion metrics logged for quality monitoring

### Story 2.3: Smart Chunking Engine
**As a** system,
**I want** to intelligently chunk documents while respecting the 10,000 character limit,
**so that** semantic context is preserved for optimal AI processing.

**Acceptance Criteria:**
1. Chunking algorithm respects natural boundaries (paragraphs, sections)
2. Each chunk remains under 10,000 characters including metadata
3. Overlap strategy implemented for context preservation (configurable 10-20%)
4. OpenAI API integration for smart chunk boundary detection
5. Chunk preview interface for user review before committing
6. Ability to manually adjust chunk boundaries
7. Chunk metadata includes source document ID, position, and context

### Story 2.4: Airtable Staging Implementation
**As a** system,
**I want** to stage all document chunks in Airtable with proper relationships,
**so that** complete traceability and referential integrity is maintained.

**Acceptance Criteria:**
1. Documents table populated with source file metadata
2. Chunks table linked to parent documents with position tracking
3. Episode ID generated and tracked for each processing session
4. Referential integrity maintained across all 8 tables
5. Rollback capability if staging fails partway
6. Audit log entry for each database operation
7. Verification step to confirm all chunks properly staged

### Story 2.5: Processing Status Dashboard
**As a** user,
**I want** to monitor document processing in real-time,
**so that** I can track progress and identify any issues.

**Acceptance Criteria:**
1. Real-time status for each document in processing queue
2. Progress indicators for conversion, chunking, and staging phases
3. Success/failure status with detailed error messages
4. Processing time and throughput metrics displayed
5. Ability to retry failed documents
6. Export processing report as CSV
7. Historical view of last 100 processed documents

## Epic 3: Ontology Management System

**Goal**: Create a comprehensive ontology management system for defining Pydantic-based entity and edge type schemas, implement validation rules with test datasets, and provide full CRUD operations for managing these custom type definitions that structure how information is extracted and stored.

### Story 3.1: Ontology List and Management Interface
**As a** user,
**I want** to view and manage all my ontologies in one place,
**so that** I can organize different knowledge domain schemas effectively.

**Acceptance Criteria:**
1. List view displaying all ontologies with name, description, entity/edge type counts
2. Create new ontology with name, description, and version fields
3. Edit ontology metadata and set active/inactive status
4. Delete ontology with confirmation and dependency checking
5. Search and filter ontologies by name or status
6. Clone existing ontology to create variations
7. Export/import ontology definitions as Python/JSON

### Story 3.2: Entity Type Definition Editor
**As a** user,
**I want** to create and edit Pydantic-based entity type definitions,
**so that** I can define custom attributes for extracted entities.

**Acceptance Criteria:**
1. Form-based interface for creating entity type classes (Person, Company, Product, etc.)
2. Field editor supporting Optional types with descriptions
3. Support for int, str, float, datetime, bool, and list field types
4. Pydantic Field configuration (description, default values, constraints)
5. Code generation preview showing resulting Python Pydantic model
6. Validation of field names against protected attributes (uuid, name, created_at, etc.)
7. Syntax validation and error highlighting for generated models

### Story 3.3: Edge Type Definition Builder
**As a** user,
**I want** to define custom edge types with attributes,
**so that** I can capture rich relationship metadata.

**Acceptance Criteria:**
1. Form interface for creating edge type classes (Employment, Investment, Partnership)
2. Attribute definition with Pydantic field types and descriptions
3. Edge type mapping configuration (Person→Company: Employment, Company→Company: Partnership)
4. Support for Entity→Entity fallback patterns
5. Preview of generated edge type Python code
6. Validation of edge type consistency with entity types
7. Template library for common relationship patterns

### Story 3.4: Test Dataset Creation
**As a** user,
**I want** to create test instances using my custom types,
**so that** I can validate my schema definitions work correctly.

**Acceptance Criteria:**
1. Dynamic form generation based on entity/edge type definitions
2. Field validation against Pydantic model constraints
3. Batch creation of test entities from CSV with type validation
4. Test edge creation with source/target entity selection
5. Sample text generation for testing extraction
6. Export test datasets as Python fixtures
7. Validation report showing type compliance

### Story 3.5: Ontology Code Generation and Export
**As a** user,
**I want** to generate and export my ontology as Python code,
**so that** I can use it with the Graphiti API.

**Acceptance Criteria:**
1. Generate complete Python module with all entity/edge type definitions
2. Include proper imports (BaseModel, Field, datetime, Optional)
3. Generate edge_type_map dictionary from configuration
4. Include docstrings and field descriptions in generated code
5. Export as .py file or copy to clipboard
6. Syntax validation of generated Python code
7. Version tracking with git-friendly formatting

## Epic 4: Knowledge Graph Operations

**Goal**: Implement the clone-before-modify pattern for safe graph manipulation, build an impact assessment engine that shows before/after changes, create an interactive graph explorer with D3.js visualization, and enable accept/reject workflows that give users full control over graph modifications.

### Story 4.1: Knowledge Graph Management Interface
**As a** user,
**I want** to create and manage multiple knowledge graphs,
**so that** I can organize different domains or projects separately.

**Acceptance Criteria:**
1. Create new knowledge graph with name, description, and ontology selection
2. List view of all graphs showing entity/edge counts and last modified date
3. Set active graph for document processing operations
4. Archive inactive graphs without deletion
5. Graph metadata editing (name, description, tags)
6. Graph statistics dashboard (total entities, edges, documents processed)
7. Export graph metadata and structure as JSON

### Story 4.2: Clone-Before-Modify Implementation
**As a** system,
**I want** to clone graphs before any modification,
**so that** users can safely preview changes without risk.

**Acceptance Criteria:**
1. Automatic graph cloning triggered before any write operation
2. Clone includes all entities, edges, and relationships
3. Unique clone ID generation with parent graph reference
4. Clone storage in separate Airtable records with "clone" status
5. Atomic clone operation with rollback on failure
6. Performance optimization for graphs with >10,000 nodes
7. Clone cleanup after accept/reject decision

### Story 4.3: Impact Assessment Engine
**As a** user,
**I want** to see a detailed comparison of changes before committing,
**so that** I can make informed decisions about graph updates.

**Acceptance Criteria:**
1. Side-by-side comparison of original vs modified graph statistics
2. List of new entities added with their attributes
3. List of new edges created with their relationships
4. Modified entity/edge highlighting with before/after values
5. Affected subgraph visualization showing impact radius
6. Change summary with counts by entity/edge type
7. Export impact report as PDF or markdown

### Story 4.4: Graph Explorer with D3.js
**As a** user,
**I want** to visually explore my knowledge graph,
**so that** I can understand relationships and patterns in my data.

**Acceptance Criteria:**
1. D3.js force-directed graph with zoom/pan controls
2. Node rendering with entity type color coding
3. Edge rendering with relationship type labels
4. Click node for details panel with all attributes
5. Search and highlight specific entities or relationships
6. Filter view by entity type, edge type, or date range
7. Performance optimization using Canvas/WebGL for >1000 nodes
8. Export graph visualization as SVG or PNG

### Story 4.5: Accept/Reject Workflow
**As a** user,
**I want** to review and decide on proposed graph changes,
**so that** I maintain control over my knowledge base quality.

**Acceptance Criteria:**
1. Review interface presenting impact assessment summary
2. Accept action commits clone changes to master graph
3. Reject action discards clone and reverts to original
4. Partial acceptance allowing selective change approval
5. Comment/reason field for decision documentation
6. Decision history log with timestamp and user
7. Undo capability within 24 hours of acceptance

### Story 4.6: Graph Query Interface
**As a** user,
**I want** to query my knowledge graph using natural language,
**so that** I can extract insights without writing complex queries.

**Acceptance Criteria:**
1. Natural language query input with auto-suggestions
2. Query translation to graph traversal operations
3. Result display as list, table, or subgraph
4. Query history with favorites/saved queries
5. Export query results as CSV or JSON
6. Query performance metrics and optimization hints
7. Template queries for common patterns

## Epic 5: Advanced Processing & Optimization

## Epic 9: Document-Driven Ontology System

**Goal**: Implement a paradigm shift from manual ontology creation to intelligent, document-driven discovery that analyzes uploaded documents, suggests custom entity/edge types through AI, and achieves 95%+ classification rates while respecting Zep v3's 10-type limits. This epic transforms the user experience from complex manual setup to guided discovery in under 10 minutes.

### Story 9.1: Core Document Analysis Pipeline
**As a** user,
**I want** to upload documents and receive AI-suggested custom types,
**so that** I can quickly create an effective ontology without manual configuration.

**Acceptance Criteria:**
1. Document upload supports multiple formats (PDF, DOCX, MD, TXT) with drag-and-drop
2. Real-time analysis progress shown during document processing
3. AI generates custom entity and edge type suggestions based on document content
4. Classification rate prediction displayed before user commits to types
5. Analysis completes within 30 seconds for typical documents
6. Results cached for repeated analysis of same document
7. Error handling for unsupported formats or processing failures

### Story 9.2: Type Management & Refinement Interface
**As a** user,
**I want** to review, edit, and optimize suggested types,
**so that** I can achieve maximum classification accuracy within the 10-type limit.

**Acceptance Criteria:**
1. Visual interface showing all suggested types with examples from document
2. Type limit indicator showing usage (e.g., "7 of 10 entity types used")
3. Inline editing of type names and descriptions
4. Preview of classification results before applying types
5. Unclassified items manager showing what doesn't match current types
6. Iterative refinement workflow to improve classification rate
7. Type optimization algorithm suggests merges to stay within limits

### Story 9.3: Knowledge Graph Creation & Matching
**As a** user,
**I want** to create knowledge graphs with optimized ontologies and find similar existing ones,
**so that** I can leverage successful patterns and avoid duplicate work.

**Acceptance Criteria:**
1. One-click knowledge graph creation after type review
2. Automatic search for similar existing knowledge graphs
3. Compatibility scoring for potential ontology matches
4. Merge wizard for combining compatible ontologies
5. Ontology library for saving and reusing successful patterns
6. Classification metrics dashboard showing performance over time
7. Export/import functionality for ontology definitions

### Story 9.4: Performance Optimization & Edge Cases
**As a** user,
**I want** fast, reliable processing with helpful guidance,
**so that** I can successfully create knowledge graphs even with challenging documents.

**Acceptance Criteria:**
1. Large document chunking with background processing
2. Helpful guidance when classification rate is below 80%
3. Domain-specific type suggestions based on document category
4. Fallback to semi-manual process for difficult domains
5. Interactive tutorial for first-time users
6. Confidence scores shown for AI suggestions
7. Performance profiling ensures <5 second type suggestion time

**Acceptance Criteria:**
1. BOX integration with OAuth authentication and folder browsing
2. Zoom transcript API integration for meeting recordings
3. Exchange email connector with folder/date range selection
4. Unified import interface showing all available sources
5. Source-specific metadata preservation (meeting participants, email headers)
6. Incremental sync to avoid re-processing unchanged documents
7. Error handling with retry logic for API failures

### Story 5.2: Concurrent Processing Queue
**As a** system,
**I want** to process multiple documents simultaneously,
**so that** I can achieve high throughput for large document sets.

**Acceptance Criteria:**
1. Queue management system with priority levels
2. Concurrent processing of up to 5 documents simultaneously
3. Worker pool management with health monitoring
4. Queue persistence across system restarts
5. Fair scheduling preventing single user monopolization
6. Dead letter queue for repeatedly failed documents
7. Queue metrics dashboard showing throughput and latency

### Story 5.3: Command Palette Implementation
**As a** power user,
**I want** keyboard-driven access to all features,
**so that** I can work efficiently without switching between mouse and keyboard.

**Acceptance Criteria:**
1. Cmd+K activation from any screen
2. Fuzzy search across commands, documents, and entities
3. Recent actions and smart suggestions
4. Keyboard navigation with arrow keys and enter
5. Command shortcuts display (e.g., "gd" for go to dashboard)
6. Context-aware commands based on current screen
7. Custom command creation for frequent workflows

### Story 5.4: Performance Optimization
**As a** system administrator,
**I want** the system optimized for high throughput,
**so that** we can process 50+ documents per hour reliably.

**Acceptance Criteria:**
1. Batch operations for Airtable to minimize API calls
2. Caching layer for frequently accessed data
3. Lazy loading for large graph visualizations
4. Database query optimization with proper indexing
5. Memory management for large document processing
6. CDN integration for static assets
7. Performance regression testing in CI/CD pipeline

### Story 5.5: Monitoring Dashboard
**As a** system administrator,
**I want** comprehensive system monitoring,
**so that** I can ensure system health and troubleshoot issues.

**Acceptance Criteria:**
1. Real-time metrics for document processing rate
2. API usage tracking for Airtable, OpenAI, and other services
3. Error rate monitoring with alerting thresholds
4. System resource utilization (CPU, memory, storage)
5. User activity analytics and usage patterns
6. Performance trends with historical comparisons
7. Export monitoring data for external analysis tools

### Story 5.6: Bulk Operations Interface
**As a** user,
**I want** to perform operations on multiple items at once,
**so that** I can manage large-scale changes efficiently.

**Acceptance Criteria:**
1. Multi-select interface for documents, entities, and edges
2. Bulk delete with safety confirmation
3. Bulk re-processing of documents with updated ontologies
4. Batch export of selected graphs or documents
5. Bulk tagging and categorization
6. Progress tracking for long-running bulk operations
7. Rollback capability for bulk changes

## Checklist Results Report

### Executive Summary
- **Overall PRD Completeness:** 92%
- **MVP Scope Appropriateness:** Just Right
- **Readiness for Architecture Phase:** Ready
- **Most Critical Gaps:** Minor gaps in data migration strategy and operational deployment details

### Category Analysis

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| 1. Problem Definition & Context | PASS | None - Clear problem statement with quantified impact |
| 2. MVP Scope Definition | PASS | Well-defined 5-epic structure with clear boundaries |
| 3. User Experience Requirements | PASS | Comprehensive UI goals with accessibility standards |
| 4. Functional Requirements | PASS | 12 functional requirements with clear acceptance criteria |
| 5. Non-Functional Requirements | PASS | 10 NFRs covering performance, reliability, and constraints |
| 6. Epic & Story Structure | PASS | 26 well-structured stories across 5 epics |
| 7. Technical Guidance | PASS | Clear architecture direction and tech stack defined |
| 8. Cross-Functional Requirements | PARTIAL | Airtable integration defined, but data migration strategy unclear |
| 9. Clarity & Communication | PASS | Well-structured document with consistent terminology |

### Recommendations
1. Define data migration approach for existing Airtable data before development
2. Specify CI/CD pipeline requirements in technical assumptions
3. Detail user roles and permissions model during architecture phase

## Next Steps

### UX Expert Prompt
Please review the Krypton Graph PRD at docs/prd.md and create the detailed UI/UX specifications. Focus on designing the form-based interfaces for Pydantic entity/edge type creation, the clone-before-modify workflow visualization, and the impact assessment UI. Ensure the command palette (Cmd+K) provides efficient access to all features. Pay special attention to making complex ontology design accessible to non-technical users while maintaining the power needed by advanced users.

### Architect Prompt
Please review the Krypton Graph PRD at docs/prd.md and create the technical architecture document. Focus on designing the Airtable data access layer with proper rate limiting, the document processing pipeline with Docling integration, and the clone-before-modify implementation strategy. Ensure the architecture can support 50+ documents/hour throughput and graph visualizations with 1000+ nodes. Address the monorepo structure, testing strategy, and deployment approach for Vercel or similar platforms.

## User Interface Design Goals

### Overall UX Vision
Create a professional, data-dense interface optimized for knowledge workers who manage complex document repositories. The design emphasizes clarity through shadcn/ui v4's clean aesthetic, productivity through keyboard-first navigation, and confidence through visual impact assessments before any destructive operations. The interface should feel familiar to users of modern development tools while remaining accessible to business users.

### Key Interaction Paradigms
• **Command Palette First**: Cmd+K access to all major functions for power users
• **Progressive Disclosure**: Simple default views with advanced options revealed on demand
• **Visual Before Textual**: Graph visualizations and impact previews prioritized over lists
• **Clone-Before-Modify**: Every modification shows preview in cloned environment first
• **Contextual Intelligence**: AI assistance available but not intrusive
• **Keyboard Navigation**: Full keyboard accessibility with visible focus indicators
• **Real-time Feedback**: Processing status, progress bars, and immediate validation

### Core Screens and Views
• **Dashboard** - Overview of knowledge graphs, recent activity, processing queue
• **Document Import Wizard** - Multi-step upload, Docling processing, chunk review
• **Smart Chunk Editor** - Side-by-side document view with AI-assisted chunking
• **Ontology Designer** - Visual canvas for entity/relationship definition
• **Impact Assessment View** - Before/after comparison with accept/reject controls
• **Graph Explorer** - Interactive D3.js visualization with zoom/pan/filter
• **Airtable Manager** - Direct view into staging database with filters
• **Processing Monitor** - Real-time status of document pipeline
• **Settings & Configuration** - API keys, processing preferences, user management

### Accessibility: WCAG AA
Meeting WCAG AA standards with focus on keyboard navigation, screen reader support, sufficient color contrast (4.5:1 minimum), and clear focus indicators using shadcn/ui v4's built-in accessibility features.

### Branding
Clean, professional aesthetic leveraging shadcn/ui v4's default design system with subtle customizations. Muted color palette with strategic use of brand colors for CTAs and status indicators. Typography optimized for long-form reading and data tables.

### Target Device and Platforms: Web Responsive
Primary target is desktop browsers (1280px+) for knowledge workers, with responsive design scaling to tablets. Mobile view provides read-only access to graphs and status monitoring. Progressive enhancement ensures core functionality works everywhere.