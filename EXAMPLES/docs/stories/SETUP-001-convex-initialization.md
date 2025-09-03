<!--
@status: Ready for Review
@priority: P0
@sprint: 1
@assigned: James (Dev Agent)
@reviewed_by: PM, Winston (System Architect)
@approved_date: 2025-09-01
@blocked_by: SETUP-000
-->

# Story: SETUP-001 - Convex Project Initialization

**Story ID:** SETUP-001  
**Epic:** SETUP-EPIC-001  
**Points:** 3  
**Priority:** P0 - Blocker  
**Type:** Infrastructure Setup  

## User Story

As a **developer**,  
I want **a fully configured Convex backend with schema and basic operations**,  
So that **we can begin building features on a solid data foundation**.

## Story Context

**Project Setup Requirements:**
- New Convex project with proper naming
- Development and production deployments
- TypeScript configuration
- Schema with all required tables including authentication
- Basic CRUD function scaffolding with auth checks
- Internal/public function separation

**Technical Stack:**
- Convex backend-as-a-service
- TypeScript for type safety
- Real-time subscriptions
- Serverless functions
- Clerk authentication integration

**⚠️ CRITICAL UPDATE REQUIRED:**
This story must be updated to include authentication and performance optimizations per Winston's architecture review. All public functions must check `ctx.auth.getUserIdentity()` and follow Convex best practices.

## Acceptance Criteria

### Functional Requirements:

1. **Convex Project Created**
   - [ ] Project named `krypton-graph-v2` created in Convex dashboard
   - [ ] Development deployment configured
   - [ ] Production deployment configured
   - [ ] API keys and URLs documented

2. **Schema Implementation**
   - [ ] Schema file created with TypeScript types
   - [ ] `ontologies` table with required fields
   - [ ] `entities` table with ontologyId reference
   - [ ] `edges` table with relationship definitions
   - [ ] `testRuns` table for test results
   - [ ] Schema successfully deployed to dev

3. **Basic Operations**
   - [ ] CRUD mutations for ontologies created
   - [ ] Query functions for listing and filtering
   - [ ] Real-time subscription verified
   - [ ] Basic validation rules implemented

### Technical Requirements:

4. **Development Setup**
   - [ ] `convex/` directory properly structured
   - [ ] `_generated/` files created by Convex CLI
   - [ ] Environment variables configured
   - [ ] Git ignore patterns updated

5. **Type Safety**
   - [ ] TypeScript types generated from schema
   - [ ] Validators using Convex's `v` object
   - [ ] Type exports for frontend consumption

## Implementation Details

### Schema Definition:
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // REQUIRED: User table for authentication
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    createdAt: v.number(),
    lastActive: v.number(),
  })
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),
  
  // Audit log for tracking operations
  audit_logs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    details: v.any(),
    timestamp: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_timestamp", ["timestamp"]),
  
  ontologies: defineTable({
    name: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived")
    ),
    zepGraphId: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_domain", ["domain"])
    .index("by_creator", ["createdBy"]),
  
  entities: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    properties: v.object({
      // Dynamic properties stored as JSON
      attributes: v.optional(v.array(v.object({
        key: v.string(),
        value: v.any(),
        type: v.string(),
      }))),
    }),
    createdAt: v.number(),
  }).index("by_ontology", ["ontologyId"])
    .index("by_type", ["type"]),
  
  edges: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    description: v.optional(v.string()),
    sourceType: v.string(),
    targetType: v.string(),
    properties: v.optional(v.object({})),
    createdAt: v.number(),
  }).index("by_ontology", ["ontologyId"]),
  
  testRuns: defineTable({
    ontologyId: v.id("ontologies"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    results: v.object({
      passed: v.number(),
      failed: v.number(),
      skipped: v.number(),
      errors: v.optional(v.array(v.string())),
    }),
  }).index("by_ontology", ["ontologyId"])
    .index("by_status", ["status"]),
});
```

### Initial Mutations with Authentication:
```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized: No authentication");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .unique();
    
  if (!user) {
    throw new ConvexError("Unauthorized: User not found");
  }
  
  return { identity, user };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx, 
  requiredRole: "admin" | "editor" | "viewer"
) {
  const { user } = await requireAuth(ctx);
  
  const roleHierarchy = {
    admin: 3,
    editor: 2,
    viewer: 1
  };
  
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new ConvexError(`Unauthorized: Requires ${requiredRole} role`);
  }
  
  return user;
}

// convex/ontologies.ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

// PUBLIC: Query with authentication
export const list = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()), // REQUIRED: Add pagination
  },
  handler: async (ctx, args) => {
    // REQUIRED: Check authentication
    const { user } = await requireAuth(ctx);
    
    let query = ctx.db.query("ontologies");
    
    if (args.status) {
      query = query.withIndex("by_status", q => q.eq("status", args.status));
    }
    
    // PERFORMANCE: Never use .collect() without limits
    const limit = Math.min(args.limit || 100, 1000);
    return await query.take(limit);
  },
});

// PUBLIC: Mutation with role checking
export const create = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // REQUIRED: Check role permissions
    const user = await requireRole(ctx, "editor");
    
    // Audit the action
    await ctx.db.insert("audit_logs", {
      userId: user._id,
      action: "ontology.create",
      entityType: "ontologies",
      entityId: "",
      details: args,
      timestamp: Date.now(),
    });
    
    const ontologyId = await ctx.db.insert("ontologies", {
      ...args,
      status: "draft",
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Schedule internal processing if needed
    await ctx.scheduler.runAfter(0, internal.ontologies.processNewOntology, {
      ontologyId,
      userId: user._id,
    });
    
    return ontologyId;
  },
});

// INTERNAL: No auth needed for system operations
export const processNewOntology = internalMutation({
  args: {
    ontologyId: v.id("ontologies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Internal processing without auth checks
    const ontology = await ctx.db.get(args.ontologyId);
    if (!ontology) return;
    
    // Perform background processing
    // This runs without blocking the user
  },
});
```

## Testing Approach

1. **Manual Verification:**
   - Use Convex dashboard to verify schema deployment
   - Test mutations via Convex CLI
   - Verify real-time updates in dashboard

2. **Basic Smoke Tests:**
   ```bash
   npx convex run ontologies:create \
     --name "Test Ontology" \
     --domain "test"
   
   npx convex run ontologies:list
   ```

## Definition of Done

- [x] Convex project created and accessible
- [x] Schema deployed successfully to dev environment
- [x] All tables created with proper indexes
- [x] Basic CRUD operations working
- [x] TypeScript types generated and verified
- [x] Environment variables documented in `.env.example`
- [x] README updated with Convex setup instructions
- [x] Team can run `npx convex dev` successfully

## Time Estimate

- Setup & Configuration: 1 hour
- Schema Implementation: 2 hours
- Basic Operations: 2 hours
- Testing & Documentation: 1 hour
- **Total: 6 hours**

## Dependencies

- **BLOCKED BY SETUP-000**: Authentication must be configured first
- Convex account created
- Clerk account for authentication
- Node.js 18+ installed
- Team agreement on schema structure

## Notes

This is the foundation story that blocks all other work. Focus on getting the schema right as changes later will require migrations. Use Convex's built-in features rather than building custom solutions.

---

<!--
@bmad_status: READY_FOR_DEVELOPMENT
@bmad_review: APPROVED
@bmad_checklist:
  - [x] Story documented
  - [x] Acceptance criteria defined
  - [x] Technical approach validated
  - [x] Dependencies identified
  - [x] Time estimates provided
  - [x] Testing approach defined
  - [ ] Developer assigned
  - [ ] Sprint planned
-->

**Status:** Ready for Review  
**Created:** September 1, 2025  
**Assigned To:** James (Dev Agent)

---

## Dev Agent Record

### Agent Model Used
- Claude Opus 4.1 (claude-opus-4-1-20250805)

### Completion Notes
- ✅ Created complete Convex schema with all required tables
- ✅ Implemented CRUD operations for all entities
- ✅ Added proper TypeScript types and validators
- ✅ Configured environment variables template
- ✅ Updated gitignore for Convex files
- ✅ Created comprehensive README with setup instructions

### File List
**Created:**
- convex/schema.ts
- convex/ontologies.ts
- convex/entities.ts
- convex/edges.ts
- convex/testRuns.ts
- convex/tsconfig.json
- convex/lib/auth.ts
- convex/users.ts
- convex/http.ts
- convex/auth.config.ts
- .env.example
- README.md

**Modified:**
- .gitignore
- convex/schema.ts (updated with auth tables)
- convex/ontologies.ts (updated with auth checks)
- .env.example (added Clerk config)
- README.md (added auth documentation)

### Change Log
1. Installed Convex npm package
2. Created Convex directory structure
3. Implemented complete schema with indexes
4. Added CRUD mutations and queries for all tables
5. Created TypeScript configuration for Convex
6. Added environment variable template
7. Updated gitignore to exclude generated files
8. Created comprehensive README with setup and testing instructions
9. **UPDATE: Added authentication tables (users, audit_logs)**
10. **UPDATE: Implemented auth helpers with role-based access**
11. **UPDATE: Updated all mutations with auth checks**
12. **UPDATE: Added internal/public function separation**
13. **UPDATE: Created user management functions**
14. **UPDATE: Added Clerk webhook handler**
15. **UPDATE: Installed svix for webhook verification**
16. **UPDATE: Updated documentation with auth setup**

## QA Results

### Review Date: 2025-09-01

### Reviewed By: Quinn (Test Architect)

### Quality Assessment Summary

**Overall Assessment:** PASS ✅

The Convex backend initialization demonstrates excellent engineering practices with comprehensive authentication, proper schema design, and security-first implementation. All critical requirements including authentication, role-based access control, and audit logging have been successfully implemented.

### Key Strengths
- **Authentication Integration:** Complete Clerk integration with webhook handling and user synchronization
- **Security Architecture:** Role-based access control (RBAC) with proper permission hierarchy
- **Schema Design:** Well-structured tables with appropriate indexes for performance
- **Audit Trail:** Comprehensive audit logging for all mutations
- **Performance Considerations:** Pagination limits and index optimization implemented
- **Internal/Public Separation:** Clear distinction between public API and internal operations

### Technical Review Points
- **Auth Checks:** All public functions verify `ctx.auth.getUserIdentity()` as required
- **Role Hierarchy:** Admin > Editor > Viewer with proper enforcement
- **Error Handling:** ConvexError used appropriately with meaningful messages
- **Background Processing:** Scheduler utilized for non-blocking operations
- **Type Safety:** Full TypeScript coverage with Convex validators

### Architecture Compliance
- ✅ Follows Winston's architecture review requirements
- ✅ Authentication checks on all public functions
- ✅ Performance optimizations with pagination
- ✅ Proper internal/public function separation
- ✅ Audit logging for compliance tracking

### Minor Observations
1. **Pagination Configuration:** Could benefit from centralized configuration module for consistency
2. **Webhook Documentation:** Setup guide would help with testing and troubleshooting

### Gate Status

Gate: PASS → docs/qa/gates/SETUP.001-convex-initialization.yml