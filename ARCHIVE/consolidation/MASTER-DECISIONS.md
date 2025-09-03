# Master Architecture Decisions
## Based on Front-End Specification v1.0 (2025-01-03)

This document represents the authoritative architecture decisions for Krypton Graph, with the front-end-spec.md taking precedence over all previous decisions.

## ✅ CONFIRMED TECHNOLOGY STACK

### Database Layer
- **Primary Database**: Airtable (CONFIRMED)
- **Access Method**: Airtable MCP (CONFIRMED)
- **Existing Schema**: Use the 8-table knowledge graph structure already in place

### Frontend Stack (FROM FRONT-END-SPEC)
- **UI Framework**: shadcn/ui v4 (MANDATED)
- **Component Primitives**: Radix UI
- **Styling**: Tailwind CSS
- **Variant Management**: CVA (Class Variance Authority)
- **Forms**: React Hook Form + Zod
- **Data Visualization**: Recharts/Tremor for metrics, D3.js for graph visualization
- **Animation**: Framer Motion
- **Tables**: Tanstack Table with virtualization
- **Icons**: Lucide Icons

### Architecture Pattern (FINAL)
**ADAPT Pattern with Zep concepts on Airtable storage**

```
┌──────────────────────────────┐
│    Frontend (shadcn/ui v4)   │ ← As specified in front-end-spec.md
├──────────────────────────────┤
│   Application Layer (Zep     │ ← Implements Zep patterns
│   patterns for graph ops)    │   (entity/edge types, episodes)
├──────────────────────────────┤
│     Airtable MCP Layer       │ ← Data operations
├──────────────────────────────┤
│    Airtable Database         │ ← Persistent storage
└──────────────────────────────┘
```

## 🎯 KEY FEATURES FROM FRONT-END SPEC

### User Personas (DEFINED)
1. **Admin User** - System setup, API keys, monitoring
2. **Advanced User** - Ontology design, entity/edge type creation
3. **Standard User** - Document import, impact assessment review

### Core Workflows (MANDATED)
1. **Ontology Creation Flow** - Visual builder for entity/edge types
2. **Document Import Flow** - Docling processing → Smart chunks → Impact assessment
3. **Clone-Before-Modify Pattern** - Zero data loss risk through cloning

### Critical UI Components (REQUIRED)
1. **Knowledge Graph Viewer** - D3.js/Canvas with pan/zoom
2. **Ontology Designer** - Drag-drop interface for type definitions
3. **Impact Assessment Dashboard** - Split-screen comparison
4. **Smart Chunk Editor** - Review and modify document chunks
5. **Command Palette** - Power user features (Cmd+K)

## 📁 INFORMATION ARCHITECTURE

### Primary Navigation
- Dashboard | Active Graph | Ontology Studio | Impact Center | System

### Key Screens (AS SPECIFIED)
1. **Dashboard** - Central hub with graph selector
2. **Active Graph** - Overview, Import & Process, Ontology, Settings
3. **Ontology Studio** - Design Center, Library, Test Workspace
4. **Impact Center** - Active Assessments, Review & Decide, History
5. **System** - Reports, Admin Settings, User Management

## 🔄 PROCESSING WORKFLOW

### Document Import Pipeline (MANDATED)
```
1. Select Knowledge Graph
2. Upload Documents
3. Docling converts to Markdown
4. LLM creates Smart Chunks
5. User reviews/approves chunks
6. System clones graph
7. Processes chunks in clone
8. Generates Impact Assessment
9. User accepts/rejects changes
10. Update or rollback
```

## 🎨 DESIGN SYSTEM

### Foundation (SPECIFIED)
- **Colors**: HSL-based theming with semantic colors
- **Typography**: Inter primary, IBM Plex Sans secondary
- **Icons**: Lucide Icons exclusively
- **Spacing**: 8px base unit, 4px for fine adjustments
- **Animations**: Under 300ms, ease-out for entering

### Accessibility (REQUIRED)
- WCAG 2.1 Level AA compliance
- Full keyboard navigation
- Screen reader support
- 44x44px minimum touch targets

### Responsive Breakpoints
- Mobile: 320-767px
- Tablet: 768-1023px
- Desktop: 1024-1919px
- Wide: 1920px+

## 🚫 REJECTED TECHNOLOGIES

Based on the front-end-spec.md and project maturity:

1. **Convex** - Too complex for current stage (REJECTED)
2. **Direct Zep Integration** - Use patterns only, not platform (ADAPTED)
3. **Custom UI Components** - Use shadcn/ui v4 instead (REPLACED)

## ✅ IMPLEMENTATION PRIORITIES

### Phase 1: Foundation (Week 1)
- [ ] Set up shadcn/ui v4 with all 46 core components
- [ ] Implement Airtable MCP wrapper
- [ ] Create Pydantic models for entity/edge types
- [ ] Build authentication with role-based access

### Phase 2: Core Features (Week 2)
- [ ] Ontology Designer with visual builder
- [ ] Document import with Docling integration
- [ ] Smart chunk editor interface
- [ ] Basic Knowledge Graph viewer

### Phase 3: Advanced Features (Week 3-4)
- [ ] Impact Assessment dashboard
- [ ] Graph comparison visualization
- [ ] Command palette (Cmd+K)
- [ ] History and audit trail

### Phase 4: Polish (Week 5)
- [ ] Animations and micro-interactions
- [ ] Performance optimization
- [ ] Accessibility testing
- [ ] Documentation

## 📊 SUCCESS METRICS

From the front-end-spec.md usability goals:
- New users can import and verify first document within 10 minutes
- Advanced users can create complete ontologies with minimal friction
- Zero data loss through clone-before-modify pattern
- All changes tracked, reported, and reversible

## 🔐 SECURITY & ADMINISTRATION

### Environment Variables (REQUIRED)
- ZEP_API_KEY (if using Zep for NLP)
- OPENAI_API_KEY (for LLM operations)
- AIRTABLE_API_KEY
- Database configuration

### User Management
- Role-based access control
- API key management interface
- System health monitoring dashboard

## 📝 NOTES

1. The front-end-spec.md is the authoritative source for UI/UX decisions
2. All frontend development must use shadcn/ui v4 components
3. The clone-before-modify pattern is non-negotiable for data safety
4. Accessibility is not optional - WCAG 2.1 AA is required
5. Performance goals: <3s load on 3G, 60 FPS animations

---
*This master decision document supersedes all previous architectural decisions where conflicts exist.*
*Last Updated: 2025-09-03*
*Based on: front-end-spec.md v1.0*