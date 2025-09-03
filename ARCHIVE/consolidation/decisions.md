# Consolidation Decisions

> **⚠️ SUPERSEDED**: This document has been superseded by `/docs/consolidation/MASTER-DECISIONS.md`
> The front-end-spec.md (v1.0) is now the authoritative source for all architecture decisions.

## Primary Technology Decision

### ADOPT: Airtable as Relational Database
**Date**: 2025-09-03
**Rationale**: 
- Project needs a simple, accessible relational database
- Previous version successfully used Airtable
- Airtable MCP provides programmatic access
- Lower complexity than real-time backends
- Visual interface for data management
- Good for prototyping and iteration

## Decision Log

### REJECT: Convex Backend Architecture
**Date**: 2025-09-03
**Source**: DOCUMENTATION/convex_documentation
**Score**: 2.45/5
**Reason**: Too complex for current project maturity level

#### Why Rejected:
- Over-engineered for current requirements
- Real-time subscriptions not needed
- Complex function architecture unnecessary
- Would introduce excessive infrastructure
- Team not ready for this complexity level

#### What We Learned:
- Keep architecture simple initially
- Avoid premature optimization
- Focus on core functionality first
- Can revisit real-time features later if needed

---

## Technology Stack Direction

### Database Layer
✅ **Airtable** - Primary relational database
✅ **Airtable MCP** - Programmatic access layer

### To Be Determined
- Frontend framework
- API layer approach
- Authentication strategy
- File storage solution

---

## Next Review Priorities

With Airtable as our database decision, prioritize reviewing:

1. **Previous Airtable implementation** - Look for patterns and lessons learned
2. **Admin UI Example** - UI patterns that work with Airtable
3. **Zep Documentation** - For any complementary features
4. **Ontologies Script** - Data modeling approaches for Airtable

Focus on finding patterns that work well with Airtable's capabilities and limitations.