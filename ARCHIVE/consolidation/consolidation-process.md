# Documentation Consolidation Process
## Pre-Requirements Collection Phase

### 🎯 Objective
Systematically review and merge relevant requirements, technical architectures, and user stories from previous implementations into the new greenfield project documentation.

### 📋 Phase 1: Discovery & Inventory

#### 1.1 Source Inventory Checklist
- [ ] **DOCUMENTATION/convex_documentation** - Review status
- [ ] **DOCUMENTATION/zep_documentation** - Review status  
- [ ] **EXAMPLES/admin-ui** - Review status
- [ ] **EXAMPLES/docs** - Review status
- [ ] **EXAMPLES/zep_examples** - Review status
- [ ] **EXAMPLES/create_example_ontologies.py** - Review status
- [ ] Additional proof of concepts (request as needed)

#### 1.2 Content Categories to Extract
For each source, identify:
- **Requirements**: Functional, non-functional, constraints
- **Architecture Decisions**: Patterns, technologies, trade-offs
- **User Stories**: Features, workflows, personas
- **Technical Insights**: Lessons learned, gotchas, best practices
- **Data Models**: Schemas, relationships, ontologies
- **Integration Points**: APIs, services, external systems

### 📊 Phase 2: Evaluation Framework

#### 2.1 Relevance Matrix
| Criteria | Weight | Score (1-5) | Notes |
|----------|--------|-------------|-------|
| Alignment with new project goals | 30% | | |
| Technical feasibility | 20% | | |
| User value | 25% | | |
| Implementation complexity | 15% | | |
| Maintenance burden | 10% | | |

#### 2.2 Decision Categories
- **✅ ADOPT**: Direct inclusion with minimal changes
- **🔄 ADAPT**: Include with modifications
- **💡 INSPIRE**: Use as reference/inspiration only
- **⏸️ DEFER**: Consider for future phases
- **❌ REJECT**: Not applicable with clear reasoning

### 🔄 Phase 3: Collection Workflow

#### 3.1 For Each Document/Example:

1. **Quick Scan** (5 min)
   - Document type and purpose
   - Key technologies/frameworks
   - Primary use cases

2. **Deep Dive** (15-30 min)
   - Extract requirements
   - Identify architectural patterns
   - Note user stories/scenarios
   - Capture technical decisions

3. **Evaluate** (5 min)
   - Apply relevance matrix
   - Assign decision category
   - Document reasoning

4. **Extract** (10-20 min)
   - Copy relevant sections to staging area
   - Tag with source reference
   - Note required adaptations

### 📁 Phase 4: Organization Structure

```
docs/
├── requirements/
│   ├── functional/
│   │   └── extracted/    # Raw extracts with source tags
│   ├── non-functional/
│   │   └── extracted/
│   └── constraints/
│       └── extracted/
├── architecture/
│   ├── decisions/        # ADRs from previous projects
│   ├── patterns/         # Reusable patterns identified
│   └── tech-stack/       # Technology choices to evaluate
├── user-stories/
│   ├── personas/         # User personas identified
│   ├── workflows/        # User workflows to implement
│   └── features/         # Feature-based stories
└── consolidation/
    ├── review-log.md     # Track review progress
    ├── decisions.md      # Document what was adopted/rejected
    └── insights.md       # Lessons learned from previous work
```

### 🎯 Phase 5: Synthesis Templates

#### Requirements Collection Template
```markdown
## Requirement: [Name]
**Source**: [Original document/example]
**Type**: Functional | Non-Functional | Constraint
**Priority**: Must Have | Should Have | Nice to Have
**Description**: 
**Acceptance Criteria**:
**Dependencies**:
**Adaptations Needed**:
```

#### Architecture Decision Record (ADR) Template
```markdown
## ADR-[Number]: [Title]
**Source**: [Original implementation]
**Status**: Adopted | Adapted | Superseded
**Context**:
**Decision**:
**Consequences**:
**Adaptations for New Project**:
```

#### User Story Template
```markdown
## Story: [Title]
**Source**: [Original example/doc]
**Persona**: 
**As a** [type of user]
**I want** [goal/desire]
**So that** [benefit/value]
**Acceptance Criteria**:
**Technical Notes from Previous Implementation**:
```

### 🚀 Next Steps

1. **Begin with High-Level Survey**
   - Quick review of all sources
   - Create initial inventory list
   - Identify obvious priorities

2. **Deep Dive Priority Sources**
   - Start with most relevant/recent implementations
   - Use evaluation framework consistently
   - Document decisions immediately

3. **Progressive Refinement**
   - Consolidate similar requirements
   - Identify patterns across implementations
   - Build unified vision

### 📝 Review Log Template

```markdown
## Review Session: [Date]
**Reviewer**: [Name]
**Source Reviewed**: [Path/Name]
**Time Spent**: [Duration]
**Decision**: ADOPT | ADAPT | INSPIRE | DEFER | REJECT
**Key Extracts**:
- Requirement: [List]
- Architecture: [List]
- User Stories: [List]
**Notes**:
**Follow-up Actions**:
```

---
*This process is designed to be iterative and flexible. Adjust weights and criteria based on project-specific needs.*