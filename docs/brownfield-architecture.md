# Krypton Graph Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the Krypton Graph codebase, including technical decisions, architectural patterns, and the reality of what's been built versus what's planned. It serves as a reference for AI agents working on enhancements defined in the PRD.

### Document Scope

Focused on areas relevant to: **Implementing the 5-epic MVP defined in the PRD**
- Epic 1: Foundation & Core Infrastructure  
- Epic 2: Document Ingestion Pipeline
- Epic 3: Ontology Management System
- Epic 4: Knowledge Graph Operations
- Epic 5: Advanced Processing & Optimization

### Change Log

| Date       | Version | Description                             | Author              |
| ---------- | ------- | --------------------------------------- | ------------------- |
| 2025-09-08 | 1.0     | Initial brownfield analysis            | Winston (Architect) |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Project Configuration**: `.bmad-core/core-config.yaml` - BMAD agent configuration
- **Main Architecture Doc**: `docs/architecture.md` - Planned architecture (aspirational)
- **Frontend Specification**: `docs/front-end-spec.md` - Authoritative UI/UX requirements v1.1
- **PRD**: `docs/prd.md` - Product requirements document v1.0
- **Version Roadmap**: `docs/version-roadmap.md` - Feature prioritization
- **Environment Config**: `.env` and `.env.local` - API keys (not committed)

### If PRD Provided - Enhancement Impact Areas

Based on the PRD's 5 epics, these areas need implementation:
- **New directories needed**: `src/app/`, `src/components/ui/`, `src/lib/airtable/`
- **Backend services**: Document processing, ontology management, graph operations
- **Frontend pages**: Dashboard, ontologies, documents, graphs, settings
- **Integration layer**: Airtable MCP, Docling, OpenAI API

## High Level Architecture

### Technical Summary

**Current State**: Requirements and architecture phase complete. NO production code exists yet - only documentation, examples, and planning artifacts.

### Actual Tech Stack (from documentation review)

| Category           | Technology      | Version  | Notes                                              |
| ------------------ | --------------- | -------- | -------------------------------------------------- |
| Runtime            | Node.js         | 18+      | Planned - not yet configured                      |
| Framework          | Next.js         | 14+      | Chosen for Vercel deployment                      |
| UI Library         | shadcn/ui       | v4       | Selected for component library                    |
| CSS Framework      | Tailwind CSS    | 3.x      | Utility-first styling                             |
| Type System        | TypeScript      | 5.x      | Type safety across stack                          |
| Database           | Airtable        | Cloud    | Via MCP integration                               |
| Doc Processing     | Docling         | Latest   | Python service for PDF conversion                 |
| Graph Viz          | D3.js           | 7.x      | For knowledge graph rendering                     |
| State Management   | Zustand         | Latest   | Planned for global state                          |
| Form Handling      | React Hook Form | Latest   | With Zod validation                               |

### Repository Structure Reality Check

- Type: **Hybrid Next.js structure** (chosen over monorepo for simplicity)
- Package Manager: npm (inferred from node_modules)
- Notable: BMAD agent framework integrated for development assistance

## Source Tree and Module Organization

### Project Structure (Actual)

```text
krypton-graph/
├── .bmad-core/          # BMAD agent configuration (EXISTS)
│   ├── tasks/           # Agent task definitions
│   ├── templates/       # Document templates
│   └── core-config.yaml # Project configuration
├── docs/                # Comprehensive documentation (EXISTS)
│   ├── architecture/    # Architecture decisions and patterns
│   ├── prd.md          # Product requirements v1.0
│   ├── prd/            # Sharded PRD components
│   ├── architecture.md # System architecture v1.2
│   ├── front-end-spec.md # UI/UX specification v1.1
│   └── version-roadmap.md # Feature prioritization
├── DOCUMENTATION/       # External documentation (EXISTS)
│   └── zep_documentation/ # Zep platform docs for reference
├── EXAMPLES/           # Example code (EXISTS)
│   └── create_example_ontologies.py # Ontology creation example
├── src/                # Source code (PARTIALLY EXISTS)
│   ├── components/     # EMPTY - needs implementation
│   │   └── ontology/   
│   │       └── export/ # Empty directory structure
│   ├── services/       # PARTIAL - only docling skeleton
│   │   └── docling/    # Python cache files only
│   └── lib/           # EMPTY - needs implementation
│       └── utils/     # Empty directory
├── app/               # SKELETON ONLY
│   └── api/          # Empty API directory
├── packages/          # EMPTY PACKAGE STRUCTURE
│   ├── airtable-sync/ # Empty - planned Airtable integration
│   ├── chunking/     # Empty - planned chunking service
│   ├── types/        # Empty - shared TypeScript types
│   ├── ui/           # Empty - UI components
│   └── zep-client/   # Has node_modules but no code
├── dist/             # BUILD ARTIFACTS (from earlier attempt?)
│   └── assets/       # JavaScript bundles (orphaned)
└── node_modules/     # Dependencies installed (531 packages)
```

### Key Modules and Their Purpose

**PLANNED BUT NOT IMPLEMENTED:**
- **API Routes**: `app/api/` exists but empty
- **Component Library**: `src/components/` has directory structure only
- **Airtable Integration**: `packages/airtable-sync/` empty
- **Document Processing**: `src/services/docling/` has Python cache but no source
- **Type Definitions**: `packages/types/` empty
- **UI Components**: `packages/ui/` empty

**EXISTING ARTIFACTS:**
- **Documentation**: Comprehensive PRD, architecture, and UI specs
- **Examples**: Python ontology creation example
- **BMAD Configuration**: Agent framework for development assistance
- **Build Artifacts**: Some JavaScript files in `dist/` (possibly from POC?)

## Data Models and APIs

### Data Models

**Airtable Schema (8 tables defined in docs):**
- **Ontologies**: Hub table for ontology management
- **EntityDefinitions**: Entity type definitions
- **EdgeDefinitions**: Edge type relationships  
- **TestDatasets**: Test data for validation
- **Documents**: Source document tracking
- **Chunks**: Document chunks with metadata
- **Entities**: Extracted knowledge entities
- **Episodes**: Processing session tracking

### API Specifications

**PLANNED BUT NOT IMPLEMENTED:**
- OpenAPI spec to be created in `docs/api/openapi.yaml`
- RESTful endpoints in `app/api/`
- Airtable MCP integration for data operations

## Technical Debt and Known Issues

### Critical Technical Debt

1. **No Production Code**: Project is documentation-only, no working implementation
2. **Orphaned Build Artifacts**: JavaScript files in `dist/` with no clear source
3. **Empty Package Structure**: Packages directory exists but contains no code
4. **Python/TypeScript Mix**: Docling service appears to be Python while rest is TypeScript
5. **No Configuration Files**: Missing package.json, tsconfig.json, next.config.js

### Workarounds and Gotchas

- **Environment Variables**: `.env` and `.env.local` exist but structure unknown
- **BMAD Dependency**: Project heavily relies on BMAD agent framework
- **No Build System**: No package.json or build configuration exists
- **Mixed Language Strategy**: Python for Docling, TypeScript for everything else unclear

## Integration Points and External Dependencies

### External Services

| Service     | Purpose           | Integration Type | Key Files                     |
| ----------- | ----------------- | ---------------- | ----------------------------- |
| Airtable    | Data storage      | MCP              | Not implemented               |
| Docling     | PDF conversion    | Python service   | `src/services/docling/` empty |
| OpenAI      | Smart chunking    | REST API         | Not implemented               |
| Zep         | Graph patterns    | Adapted patterns | Documentation only            |

### Internal Integration Points

- **Frontend-Backend**: Next.js API routes planned but not created
- **MCP Server**: Airtable MCP for data operations not configured
- **Background Jobs**: Document processing queue not implemented

## Development and Deployment

### Local Development Setup

**CANNOT RUN - Missing critical files:**
1. No package.json for dependency management
2. No Next.js configuration
3. No TypeScript configuration
4. No build scripts

**Required Setup (from documentation):**
```bash
# These commands won't work - files don't exist
npm install  # No package.json
npm run dev  # No scripts defined
```

### Build and Deployment Process

- **Build Command**: Not defined (no package.json)
- **Deployment Target**: Vercel planned but not configured
- **Environments**: Dev/staging/prod planned but not set up

## Testing Reality

### Current Test Coverage

- **Unit Tests**: 0% - no tests exist
- **Integration Tests**: None
- **E2E Tests**: None  
- **Manual Testing**: Not possible - no working code

### Running Tests

No test infrastructure exists. Planned testing stack:
- Jest for unit tests
- React Testing Library for components
- Playwright for E2E tests

## If Enhancement PRD Provided - Impact Analysis

### Files That Will Need Creation (not modification)

Based on Epic 1 (Foundation & Core Infrastructure):

**New files needed:**
- `package.json` - Project configuration
- `next.config.js` - Next.js configuration  
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Landing page
- `src/app/api/health/route.ts` - Health check endpoint
- `src/lib/airtable/client.ts` - Airtable MCP wrapper
- `src/components/ui/[46 components]` - shadcn/ui components

### New Modules Needed

All modules need to be created from scratch:
- Airtable data access layer with rate limiting
- Authentication system (simple for v1.0)
- Dashboard components and pages
- API route handlers
- Type definitions for all entities

### Integration Considerations

- Must follow Next.js App Router patterns
- Need to integrate Airtable MCP server
- Must set up shadcn/ui v4 components properly
- Environment variable management critical

## Architecture Decision Records

### Key Decisions Made

1. **Next.js over custom stack** - Chosen for Vercel optimization
2. **shadcn/ui v4 for components** - Modern, accessible, customizable
3. **Airtable over custom database** - Rapid development, existing schema
4. **Hybrid structure over monorepo** - Simplicity for single developer
5. **MCP for Airtable access** - Abstraction and rate limiting built-in

### Deferred Decisions

1. **Authentication complexity** - Simple auth for v1.0, JWT later
2. **Monitoring strategy** - Basic logging first, full observability in v1.1
3. **CI/CD pipeline** - Manual deployment initially, automation later
4. **Testing strategy** - Focus on manual testing for MVP, automated tests in v1.1

## Appendix - Useful Commands and Scripts

### Frequently Needed Setup Commands

```bash
# Initialize Next.js project (REQUIRED FIRST STEP)
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir=false

# Add shadcn/ui v4
npx shadcn@latest init
npx shadcn@latest add [component-name]

# Install key dependencies
npm install @tanstack/react-table d3 framer-motion react-hook-form zod zustand

# Set up MCP for Airtable
npx @modelcontextprotocol/create-client airtable
```

### Environment Variables Required

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=appvLsaMZqtLc9EIX

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_key

# Docling Service
DOCLING_SERVICE_URL=http://localhost:8000

# Zep Configuration (future)
ZEP_API_KEY=your_zep_key
ZEP_API_URL=https://api.zep.ai
```

## Critical Next Steps

1. **Initialize Next.js Project** - Run create-next-app to establish foundation
2. **Configure TypeScript** - Set up tsconfig.json with strict mode
3. **Install Dependencies** - Create proper package.json with all dependencies
4. **Set Up shadcn/ui** - Initialize component library
5. **Create Basic Routes** - Implement dashboard and API health check
6. **Configure Airtable MCP** - Set up data access layer
7. **Implement Auth** - Simple authentication for 1-3 users

## Summary

This is a **greenfield project masquerading as brownfield** - extensive documentation exists but NO production code has been written. The project is well-planned with comprehensive requirements, architecture, and UI specifications, but implementation has not begun. All code must be created from scratch following the documented patterns and decisions.