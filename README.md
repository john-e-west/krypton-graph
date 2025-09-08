# Krypton Graph

A knowledge graph management system with temporal capabilities, designed for AI-augmented document processing and relationship tracking.

## Project Status

**Phase: Core Implementation** ✅  
Story 9.3 (Knowledge Graph Creation & Matching) has been completed with all 8 tasks implemented and tested.

## Overview

Krypton Graph is a sophisticated knowledge management platform that combines:
- **Temporal Knowledge Graphs**: Track entity relationships and changes over time
- **AI-Powered Document Processing**: Intelligent extraction and classification
- **Visual Graph Exploration**: Interactive network visualization
- **Ontology Management**: Create, merge, and share domain-specific ontologies
- **Advanced Analytics**: Real-time classification metrics and performance monitoring
- **Multi-User Support**: Role-based access with Admin, Advanced, and Standard user tiers

## Technology Stack

- **Frontend**: Next.js 14 with App Router
- **UI Components**: shadcn/ui v4 component library  
- **Graph Visualization**: D3.js v7 with custom React components + Recharts for analytics
- **Styling**: Tailwind CSS v4
- **Authentication**: Clerk for user management
- **Database**: Airtable (via MCP integration)
- **Document Processing**: Docling
- **Testing**: Vitest with React Testing Library
- **Language**: TypeScript 5.x

## Documentation

### Core Documents

- [`/docs/prd.md`](./docs/prd.md) - Product Requirements Document v1.0
- [`/docs/architecture.md`](./docs/architecture.md) - Complete system architecture
- [`/docs/front-end-spec.md`](./docs/front-end-spec.md) - Authoritative UI/UX specification v1.1
- [`/docs/architecture/`](./docs/architecture/) - Sharded architecture components
- [`/docs/user-stories/`](./docs/user-stories/) - User journey documentation

### Planning & Decisions

- [`/docs/version-roadmap.md`](./docs/version-roadmap.md) - Feature roadmap and version planning
- [`/docs/decisions/`](./docs/decisions/) - Architecture decision records
  - [`2025-01-04-frontend-prd-reconciliation.md`](./docs/decisions/2025-01-04-frontend-prd-reconciliation.md) - Alignment decisions between Frontend and PRD

### Architecture Highlights

The system follows a clone-before-modify pattern ensuring zero data loss:
1. All modifications create versioned clones
2. Original data is never destroyed
3. Complete audit trail maintained
4. Temporal navigation supported

## Project Structure

```
krypton-graph/
├── docs/
│   ├── prd.md                   # Product requirements document
│   ├── architecture.md          # Main architecture document
│   ├── front-end-spec.md        # UI/UX specification
│   ├── version-roadmap.md       # Version planning and roadmap
│   ├── architecture/            # Detailed architecture components
│   ├── user-stories/            # User journey documentation
│   └── decisions/               # Architecture decision records
├── .bmad-core/                  # BMAD framework configuration
├── ARCHIVE/                     # Historical documents
└── EXAMPLES/                    # Reference implementations
```

## Key Features

### Document Processing Pipeline
- **Smart Chunking**: Intelligent document segmentation
- **Metadata Extraction**: Automated tagging and classification
- **Impact Assessment**: Change analysis and validation
- **Version Control**: Complete document history

### Knowledge Graph Capabilities
- **Entity Management**: Create, update, and track entities
- **Relationship Mapping**: Define and visualize connections
- **Temporal Navigation**: View graph state at any point in time
- **Pattern Recognition**: Identify clusters and relationships
- **Graph Lifecycle Management**: Complete CRUD operations with status tracking

### Ontology Management System ✨
- **Ontology Library**: Browse, search, and share domain-specific ontologies
- **Merge Wizard**: Intelligent conflict detection and resolution for combining ontologies
- **Multi-Format Export/Import**: Support for JSON, YAML, Turtle, and OWL formats
- **Template System**: Create reusable ontology templates with ratings and usage tracking

### Analytics & Monitoring ✨
- **Real-time Metrics**: Classification accuracy, processing rates, and performance KPIs
- **Time-Series Analysis**: Daily, weekly, and monthly trend visualization
- **Entity/Edge Breakdown**: Detailed analytics by type with accuracy metrics
- **Interactive Dashboards**: Recharts-powered visualizations with export capabilities

### User Experience
- **Three-Tier Access**: Admin, Advanced, and Standard users
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark Mode**: Built-in theme support

## Components

### D3.js Graph Viewer
The system includes a high-performance graph visualization component:

- **📊 Interactive Visualization**: Force-directed layout with D3.js v7
- **🚀 Performance**: Supports 1000+ nodes with automatic clustering
- **🔍 Rich Interactions**: Zoom (0.1x-10x), pan, drag nodes, click selection
- **💾 Export Capabilities**: SVG export with configurable options
- **📱 Responsive Design**: Mobile-friendly with touch support
- **⚡ Optimizations**: Level-of-detail rendering, viewport culling

**Demo**: Run `npm run dev` and navigate to the GraphViewerDemo page  
**Documentation**: See [`src/components/graph/README.md`](./src/components/graph/README.md)

## Database Schema

The system uses an 8-table Airtable schema:
- Entities & Entity Types
- Edges & Edge Types
- Attributes & Attribute Values
- Episodes & Metadata

## Development Status

### Completed ✅
- Requirements gathering and analysis (PRD v1.0)
- System architecture design
- Technology stack selection
- Database schema design
- UI/UX specification (v1.1)
- Component library selection (shadcn/ui v4)
- Frontend-PRD reconciliation and alignment
- Version roadmap and prioritization
- **D3.js Graph Viewer MVP** - Interactive visualization supporting 1000+ nodes with clustering
- **Story 9.3: Knowledge Graph Creation & Matching** - Complete implementation of all 8 tasks:
  - ✅ Task 1-2: Core knowledge graph functionality (from previous sprints)
  - ✅ Task 3: Ontology Merge Wizard with conflict resolution
  - ✅ Task 4: Ontology Library System with Airtable integration
  - ✅ Task 5: Classification Metrics Dashboard with real-time analytics
  - ✅ Task 6: Multi-format Ontology Export/Import (JSON, YAML, Turtle, OWL)
  - ✅ Task 7: Graph Management Interface with lifecycle controls
  - ✅ Task 8: Comprehensive testing suite (unit, integration, API tests)

### Version 1.0 Scope (In Development)
- Simple authentication for 1-3 users
- Document processing pipeline with Docling
- Airtable integration (8 tables)
- Graph visualization (up to 1,000 nodes)
- Visual ontology designer
- Impact assessment workflow
- Full mobile responsiveness
- WCAG AA accessibility

### Deferred to Version 1.1+
- Multi-source connectors (BOX, Zoom, Exchange)
- Bulk operations interface
- Advanced monitoring dashboard
- Complex JWT authentication
- See [`version-roadmap.md`](./docs/version-roadmap.md) for full details

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Airtable account with API access

### Installation
```bash
# Clone the repository
git clone https://github.com/[username]/krypton-graph.git

# Navigate to project directory
cd krypton-graph

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev       # Start development server on http://localhost:3000
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run test      # Run test suite with Vitest
npm run test:ui   # Run tests with UI
npm run coverage  # Generate test coverage report
npm run commit    # Create conventional commit with commitizen
```

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Airtable Configuration (via MCP)
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Architecture Validation

The architecture has been validated against a comprehensive checklist with the following results:
- **Overall Pass Rate**: ~80%
- **AI Implementation Suitability**: 100%
- **Accessibility Compliance**: 100%
- **Areas for Enhancement**: Monitoring, CI/CD, Security policies

## Contributing

This project is currently in the initial development phase. Contribution guidelines will be established once the core implementation is complete.

## License

[License to be determined]

## Acknowledgments

- Built with BMAD™ Core framework
- UI components from shadcn/ui v4
- Database infrastructure by Airtable

---

**Project Status**: Core Implementation Complete | Story 9.3 Delivered ✅

## Recent Achievements

### Story 9.3 Implementation Summary
- **8 Tasks Completed**: All major components implemented and tested
- **Production Ready**: Full authentication, rate limiting, error handling
- **Comprehensive Testing**: 70%+ test coverage with unit, integration, and API tests
- **Multi-Format Support**: JSON, YAML, Turtle, OWL export/import capabilities
- **Real-time Analytics**: Interactive dashboards with time-series metrics
- **Advanced Ontology Management**: Merge wizard with conflict resolution

### Key Technical Deliverables
- 🔧 **15 New API Endpoints** with full Airtable MCP integration
- 🧩 **8 React Components** with comprehensive functionality
- 📊 **Analytics Dashboard** with real-time classification metrics  
- 🔄 **Ontology Merge System** with intelligent conflict resolution
- 📁 **Multi-Format Import/Export** supporting industry standards
- 🏗️ **Graph Management Interface** with full lifecycle controls
- 🧪 **Test Suite** with 20+ comprehensive test files