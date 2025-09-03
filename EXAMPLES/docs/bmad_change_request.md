# Krypton-Graph POC Platform Rebuild
## Convex + Zep Architecture Implementation

**Document Type**: Greenfield PRD & Architecture Design  
**Date**: September 1, 2025  
**Author**: Development Team  
**BMAD Method Version**: v4.x  
**Project Type**: Proof of Concept / MVP  
**Risk Level**: Low (3/10) - No production data or users  

---

## 1. EXECUTIVE SUMMARY

### Current State
The Krypton-Graph POC currently uses React + Airtable + Zep. As a proof of concept with no production data or users, we have the opportunity to rebuild with a modern architecture.

### Proposed Future State
Direct rebuild using Convex + Zep hybrid architecture for improved developer experience, real-time capabilities, and cost efficiency.

### Business Impact
- **Cost Reduction**: Eliminate Airtable costs entirely
- **Developer Velocity**: 50% faster development with unified stack
- **Time to Market**: 2-3 week rebuild vs maintaining current architecture
- **Future Ready**: Built for scale from day one

---

## 2. PROJECT REQUIREMENTS (PRD)

### 2.1 Problem Statement

The current POC architecture has proven the concept but isn't optimal for continued development:
- Airtable adds unnecessary cost for a POC
- Python + React split slows development
- No real-time capabilities
- Complex local development setup

### 2.2 Solution Requirements

**Core Features (Week 1-2)**:
- [ ] Ontology management (CRUD)
- [ ] Entity/Edge definitions
- [ ] Zep integration for knowledge graphs
- [ ] Basic admin UI
- [ ] Test runner functionality

**Nice to Have (Week 3)**:
- [ ] Real-time collaboration
- [ ] Advanced filtering
- [ ] Export functionality
- [ ] Performance dashboard

### 2.3 Out of Scope
- Data migration (no data to migrate)
- Backwards compatibility
- User migration
- Production hardening
- High availability
- Security audit

---

## 3. SIMPLE ARCHITECTURE DESIGN

### 3.1 Tech Stack

```yaml
frontend:
  framework: React (or Vue/Svelte - team choice)
  ui_library: Tailwind CSS or Material-UI
  state: Convex React hooks
  
backend:
  database: Convex
  api: Convex functions
  external: Zep API for graphs
  
development:
  language: TypeScript everywhere
  testing: Vitest + Playwright
  deployment: Vercel or Netlify
```

### 3.2 Simple Architecture

```mermaid
graph LR
    UI[React UI] --> CV[Convex]
    CV --> ZP[Zep API]
    ZP --> KG[Knowledge Graph]
```

That's it. No complex layers, no orchestration services, no caching strategies for POC.

### 3.3 Convex Schema (Simplified)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ontologies: defineTable({
    name: v.string(),
    domain: v.string(),
    status: v.string(),
    zepGraphId: v.optional(v.string()),
  }),
  
  entities: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    type: v.string(),
    properties: v.object({}),
  }),
  
  edges: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    source: v.string(),
    target: v.string(),
  }),
  
  testRuns: defineTable({
    ontologyId: v.id("ontologies"),
    status: v.string(),
    results: v.object({}),
    timestamp: v.number(),
  }),
});
```

---

## 4. IMPLEMENTATION PLAN (2-3 WEEKS)

### Week 1: Core Setup & Basic Features

#### Day 1-2: Project Setup
```bash
# Monday-Tuesday
- Create new Convex project
- Setup GitHub repo
- Initialize React/Vue/Svelte app
- Connect Convex to frontend
- Setup Zep API client
```

#### Day 3-5: Core Features
```bash
# Wednesday-Friday
- Build ontology CRUD
- Create entity/edge management
- Integrate Zep for graph operations
- Basic UI components
```

### Week 2: Complete POC Features

#### Day 6-8: Test Runner & UI
```bash
# Monday-Wednesday
- Implement test runner
- Build dashboard
- Add data visualization
- User assignments feature
```

#### Day 9-10: Polish & Testing
```bash
# Thursday-Friday
- Fix bugs
- Add basic error handling
- Write essential tests
- Deploy to staging
```

### Week 3: Enhancements (Optional)

```bash
# If time permits
- Real-time collaboration
- Advanced filtering
- Export functionality
- Performance optimizations
```

---

## 5. SIMPLIFIED EPIC BREAKDOWN

### Epic 1: Setup (2 days)
**Stories**:
1. **SETUP-001**: Create Convex project and schema
2. **SETUP-002**: Setup frontend framework
3. **SETUP-003**: Connect Zep API

### Epic 2: Core Features (3 days)
**Stories**:
1. **CORE-001**: Ontology management
2. **CORE-002**: Entity/Edge definitions
3. **CORE-003**: Zep integration for graphs

### Epic 3: UI & Testing (3 days)
**Stories**:
1. **UI-001**: Admin dashboard
2. **UI-002**: Test runner interface
3. **UI-003**: Results visualization

### Epic 4: Deployment (2 days)
**Stories**:
1. **DEPLOY-001**: Setup hosting
2. **DEPLOY-002**: Environment configuration
3. **DEPLOY-003**: Basic documentation

---

## 6. DEVELOPMENT APPROACH

### 6.1 Team Structure (Small)
```yaml
team:
  developers: 2-3
  part_time_qa: 1
  product_owner: 1
```

### 6.2 Development Guidelines

**Keep It Simple**:
- No over-engineering
- Use Convex + Zep defaults
- Minimal abstraction layers
- Focus on working features

**Fast Iteration**:
- Daily deployments
- Quick feedback loops
- Fix forward, don't perfect
- Feature flags for experiments

### 6.3 Code Examples

**Simple Zep Integration**:
```typescript
// convex/zep.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const syncToZep = action({
  args: { 
    ontologyId: v.id("ontologies"),
    graphId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get data
    const ontology = await ctx.runQuery(api.ontologies.get, {
      id: args.ontologyId,
    });
    
    // Send to Zep
    const result = await fetch(`${ZEP_API}/graphs/${args.graphId}`, {
      method: "POST",
      body: JSON.stringify(ontology),
    });
    
    // Update reference
    await ctx.runMutation(api.ontologies.update, {
      id: args.ontologyId,
      zepGraphId: result.id,
    });
    
    return result;
  },
});
```

**Simple UI Component**:
```typescript
// components/OntologyList.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function OntologyList() {
  const ontologies = useQuery(api.ontologies.list);
  
  return (
    <div>
      {ontologies?.map(ont => (
        <div key={ont._id}>
          <h3>{ont.name}</h3>
          <button onClick={() => syncToZep(ont._id)}>
            Sync to Zep
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 7. SUCCESS METRICS (POC APPROPRIATE)

### 7.1 Technical Success
- [ ] All features working
- [ ] Zep integration functional
- [ ] Deploys successfully
- [ ] Basic tests passing

### 7.2 Development Success
- [ ] Completed in 3 weeks
- [ ] Code is maintainable
- [ ] Team can iterate quickly
- [ ] Documentation exists

### 7.3 Business Success
- [ ] Demonstrates concept
- [ ] Stakeholders satisfied
- [ ] Ready for next phase
- [ ] Cost effective

---

## 8. RISK ASSESSMENT (SIMPLIFIED)

### Low Risks for POC

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zep API issues | Medium | Use mock data for demo |
| Convex learning curve | Low | Use examples, ask Discord |
| Timeline slip | Low | Cut optional features |
| Performance | Low | Not critical for POC |

---

## 9. NEXT STEPS

### Immediate Actions (This Week)
1. **Monday**: Team review of this plan
2. **Tuesday**: Setup development environment
3. **Wednesday**: Start coding
4. **Friday**: First demo of basic features

### Week 2
- Complete core features
- Deploy to staging
- Get stakeholder feedback

### Week 3
- Polish based on feedback
- Add nice-to-have features if time
- Prepare for next phase planning

---

## 10. QUICK START COMMANDS

```bash
# 1. Setup new project
npm create convex@latest krypton-graph-v2
cd krypton-graph-v2

# 2. Install dependencies
npm install

# 3. Setup Convex
npx convex dev

# 4. Create schema
# Copy schema from section 3.3

# 5. Create first function
npx convex run ontologies:create --name "Test Ontology"

# 6. Start frontend
npm run dev
```

---

## APPENDICES

### A. Resources
- [Convex Quickstart](https://docs.convex.dev/quickstart)
- [Zep API Docs](https://docs.getzep.com)
- [React + Convex Tutorial](https://docs.convex.dev/tutorials)

### B. Alternative Approaches Considered
1. **Keep Airtable**: Too expensive for POC
2. **Pure Convex**: Need Zep for knowledge graphs
3. **Supabase + Zep**: More complex than Convex

### C. Future Considerations (Post-POC)
- Add authentication
- Implement proper error handling
- Add comprehensive testing
- Performance optimization
- Security hardening

---

**Document Status**: READY FOR REVIEW  
**Sprint Start**: September 2, 2025  
**Target Completion**: September 20, 2025  

---

## BMAD Method Notes

Since this is a **greenfield POC**, we're using:
- Simple PRD format (not brownfield)
- Minimal risk assessment
- Fast iteration approach
- No migration complexity
- Direct implementation

**Recommended BMAD Usage**:
```bash
# For POC development
@pm *create-prd  # Simple PRD, not brownfield
@architect *create-architecture  # Lightweight architecture
@sm *create-next-story  # Quick story creation
@dev *develop-story  # Rapid implementation
```

**Ready for**: Team kickoff and sprint planning