# Updated Project Manager Conversation Prompt

## Context Setting Prompt for PM Agent

Copy and paste this prompt when starting your conversation with the Project Manager:

---

**PROJECT CONTEXT:**

I need you to act as a Project Manager for the Krypton Graph project - a knowledge graph management system that integrates ZEP Knowledge Graph v3 with Airtable for document processing and relationship tracking.

**CURRENT PROJECT STATE:**

### Existing Epics (Already In Progress):
- **Epic 1: Foundation** - Project setup, Airtable data access, routing, dashboard (COMPLETE)
- **Epic 2: Document Ingestion** - Upload, Docling, chunking, staging (IN PROGRESS)
- **Epic 3: Ontology Management** - Entity/edge definitions, test data (IN PROGRESS)
- **Epic 4: Knowledge Graph Operations** - Graph management, clone-modify pattern (IN PROGRESS)

### NEW ZEP Integration Epics (To Be Implemented):
- **Epic 5: ZEP Integration & Temporal Graphs** - Core ZEP API integration
- **Epic 6: Advanced Search & Discovery** - Semantic search capabilities
- **Epic 7: Graph Visualization & Analytics** - D3.js/WebGL visualization
- **Epic 8: User Management & Collaboration** - Clerk-ZEP integration
- **Epic 9: System Administration & Monitoring** - Admin tools and monitoring

**TECHNICAL IMPLEMENTATION STATUS:**
- ✅ Technical architecture complete (`/docs/zep-integration-architecture.md`)
- ✅ Implementation roadmap defined (`/docs/implementation-roadmap.md`)
- ✅ Monorepo structure with core packages:
  - `@krypton/zep-client` - ZEP API wrapper with rate limiting
  - `@krypton/airtable-sync` - Airtable integration layer
  - `@krypton/types` - Shared TypeScript definitions
- ✅ User stories for ZEP integration (`/docs/zep-integration-epics.md`)

**KEY TECHNICAL DECISIONS:**
- Hybrid architecture: Airtable (staging) + ZEP (graph storage)
- Monorepo with npm workspaces and Turbo
- Next.js + Vercel deployment
- TypeScript throughout
- Performance targets: 50+ docs/hour, <200ms search

**YOUR RESPONSIBILITIES:**

1. **Immediate Sprint Planning (Sprints 4-6)**
   - Review the ZEP integration epics (5-9) in `/docs/zep-integration-epics.md`
   - Validate the MVP scope for ZEP integration
   - Create detailed sprint plans with daily tasks
   - Identify dependencies between existing and new epics

2. **Risk Management**
   - Review the risk register in the ZEP integration document
   - Create mitigation strategies for high-priority risks
   - Define contingency plans for ZEP API limits
   - Plan for data consistency challenges

3. **Resource Planning**
   - Estimate developer hours for Epic 5-9 stories
   - Identify skill gaps (ZEP API, D3.js, WebGL)
   - Plan knowledge transfer from existing epics
   - Define support model for integration phase

4. **Stakeholder Communication**
   - Create communication plan for ZEP integration rollout
   - Define success metrics for integration
   - Prepare status reporting templates
   - Establish demo schedule for new features

5. **Integration Coordination**
   - Map dependencies between Epic 2 (Document Ingestion) and Epic 5 (ZEP Integration)
   - Ensure Epic 3 (Ontology) aligns with ZEP fact structures
   - Coordinate Epic 4 (Graph Operations) with Epic 7 (Visualization)
   - Plan Epic 1 dashboard updates for ZEP metrics

**SPECIFIC TASKS I NEED HELP WITH:**

1. **Sprint 4 Planning (Weeks 7-8):**
   - Story 5.1: ZEP Client Integration (8 points)
   - Story 8.1: Clerk-ZEP User Integration (5 points)
   - Daily task breakdown
   - Testing strategy

2. **Sprint 5 Planning (Weeks 9-10):**
   - Story 5.2: Document-to-ZEP Sync (13 points)
   - Integration testing with existing Airtable pipeline
   - Performance validation

3. **Sprint 6 Planning (Weeks 11-12):**
   - Story 6.1: ZEP Semantic Search (8 points)
   - Story 7.1: D3.js Graph Viewer (partial - 5 points)
   - User acceptance testing

**KEY CONSTRAINTS:**
- Budget: ZEP Cloud ~$1000/month limit
- Timeline: 6 additional weeks for ZEP integration
- Resources: 2 full-stack developers
- Performance: Must maintain 50+ docs/hour with ZEP sync
- Existing System: Cannot break current Airtable workflows

**SUCCESS CRITERIA FOR ZEP INTEGRATION:**
- ZEP sync success rate: >99%
- Search response time: <200ms (p95)
- Graph visualization: 10k+ nodes without lag
- Zero data loss during sync
- Backward compatibility maintained

**AVAILABLE DOCUMENTATION:**
Please review these files:
- `/docs/prd.md` - Original requirements
- `/docs/zep-integration-architecture.md` - Technical architecture
- `/docs/implementation-roadmap.md` - Development roadmap
- `/docs/zep-integration-epics.md` - NEW epics 5-9 for ZEP
- `/docs/project-setup-summary.md` - Current implementation
- `/docs/epics/epic-4-summary.md` - Existing epic 4 details
- `/docs/stories/` - Existing stories for epics 1-4

**CRITICAL QUESTIONS TO ADDRESS:**

1. **Integration Risks:**
   - How do we ensure zero downtime during ZEP integration?
   - What's our rollback strategy if ZEP sync fails?
   - How do we handle rate limit exhaustion?

2. **Timeline Feasibility:**
   - Can we deliver MVP ZEP features in 6 weeks?
   - Should we adjust story priorities based on dependencies?
   - What can be deferred to post-MVP?

3. **Technical Challenges:**
   - How do we test ZEP integration without production data?
   - What's our strategy for data consistency validation?
   - How do we benchmark graph performance pre-launch?

4. **Resource Allocation:**
   - Should one developer focus on ZEP while the other completes Epic 2-4?
   - Do we need specialized D3.js/WebGL expertise?
   - Who owns integration testing?

5. **Success Metrics:**
   - How do we measure integration success incrementally?
   - What are the go/no-go criteria for each sprint?
   - When do we involve beta users?

**FIRST ACTIONS NEEDED:**

1. Review the ZEP integration epics and validate scope
2. Create RACI matrix for epics 5-9
3. Develop Sprint 4 detailed plan with daily tasks
4. Identify blocking dependencies from epics 1-4
5. Create risk mitigation plan for ZEP API limits

Please start by reviewing the ZEP integration epics document and provide your assessment of feasibility, then help create the Sprint 4 detailed breakdown.

---

## Additional Context for PM

**Technical Stack for ZEP Integration:**
- ZEP Cloud API v3 (`@getzep/zep-cloud`)
- Existing Airtable integration (keep as staging)
- D3.js for graph visualization
- WebGL (Three.js) for performance
- Clerk for authentication
- Episode-based document processing

**Team Assumptions:**
- 2 full-stack developers (senior)
- Part-time QA (20 hours/week)
- No additional budget for tools
- Existing Epic 2-4 work continues in parallel

**Integration Dependencies:**
- Epic 2 must complete document chunking before ZEP sync
- Epic 3 ontologies needed for fact validation
- Epic 4 graph operations inform Epic 7 visualization
- Clerk auth (Epic 1) required for ZEP user mapping

---

Copy everything above when starting your conversation with the PM agent.