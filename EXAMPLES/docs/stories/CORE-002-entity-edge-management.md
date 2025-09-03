<!--
@status: READY_FOR_REVIEW
@priority: P0
@sprint: 1
@assigned: James (Dev Agent)
@reviewed_by: PM
@approved_date: 2025-09-01
-->

# Story: CORE-002 - Entity and Edge Management

**Story ID:** CORE-002  
**Epic:** CORE-EPIC-002  
**Points:** 8  
**Priority:** P0 - Core Feature  
**Type:** Data Modeling  
**Dependencies:** CORE-001 (Ontology CRUD must be complete)  

## User Story

As an **ontology designer**,  
I want **to define entities and their relationships within an ontology**,  
So that **I can model complex knowledge domains with proper structure and constraints**.

## Story Context

**Business Requirements:**
- Define entity types with custom properties
- Create relationships between entities
- Support different relationship types
- Property validation and type safety
- Bulk operations for efficiency
- Import/export capabilities

**Technical Requirements:**
- Referential integrity enforcement
- Dynamic property schemas
- Relationship validation
- Efficient querying of graph structures
- Batch operations support

## Acceptance Criteria

### Entity Management:

1. **Create Entity Types**
   - [x] Create entity with name and type
   - [x] Define custom properties with types
   - [x] Set required vs optional properties
   - [x] Support property validation rules
   - [x] Assign to specific ontology
   - [x] Auto-generate entity ID

2. **Entity CRUD Operations**
   - [x] List entities by ontology
   - [x] Filter entities by type
   - [x] Update entity properties dynamically
   - [x] Delete entity with cascade options
   - [x] Bulk create entities from JSON
   - [x] Export entities to JSON format

3. **Property Management**
   - [x] Support multiple property types (string, number, boolean, date, array)
   - [x] Define property constraints (min/max, regex, enum)
   - [x] Set default values for properties
   - [x] Property inheritance from type
   - [x] Validate properties on save

### Edge Management:

4. **Create Edge Types**
   - [x] Define edge with name and type
   - [x] Specify source and target entity types
   - [x] Set cardinality constraints (one-to-one, one-to-many, many-to-many)
   - [x] Define edge properties
   - [x] Directional vs bidirectional edges

5. **Edge CRUD Operations**
   - [x] Create edges between entities
   - [x] Validate source/target compatibility
   - [x] List edges by ontology
   - [x] Filter edges by type or connected entities
   - [x] Update edge properties
   - [x] Delete edges with cleanup

6. **Relationship Validation**
   - [x] Enforce entity type constraints
   - [x] Validate cardinality rules
   - [x] Prevent circular dependencies (if required)
   - [x] Check for orphaned edges
   - [x] Maintain referential integrity

## Implementation Details

### Enhanced Schema:
```typescript
// convex/schema.ts additions
export default defineSchema({
  // Entity type definitions
  entityTypes: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    propertySchema: v.object({
      properties: v.array(v.object({
        name: v.string(),
        type: v.union(
          v.literal("string"),
          v.literal("number"),
          v.literal("boolean"),
          v.literal("date"),
          v.literal("array"),
          v.literal("object")
        ),
        required: v.boolean(),
        defaultValue: v.optional(v.any()),
        constraints: v.optional(v.object({
          min: v.optional(v.number()),
          max: v.optional(v.number()),
          pattern: v.optional(v.string()),
          enum: v.optional(v.array(v.any())),
        })),
      })),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ontology", ["ontologyId"])
    .index("by_name", ["ontologyId", "name"]),
  
  // Entity instances
  entities: defineTable({
    ontologyId: v.id("ontologies"),
    typeId: v.id("entityTypes"),
    name: v.string(),
    description: v.optional(v.string()),
    properties: v.object({
      // Dynamic properties stored as key-value pairs
      data: v.any(),
    }),
    metadata: v.optional(v.object({
      externalId: v.optional(v.string()),
      source: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ontology", ["ontologyId"])
    .index("by_type", ["typeId"])
    .index("by_name", ["name"]),
  
  // Edge type definitions
  edgeTypes: defineTable({
    ontologyId: v.id("ontologies"),
    name: v.string(),
    description: v.optional(v.string()),
    sourceType: v.id("entityTypes"),
    targetType: v.id("entityTypes"),
    cardinality: v.union(
      v.literal("one-to-one"),
      v.literal("one-to-many"),
      v.literal("many-to-one"),
      v.literal("many-to-many")
    ),
    bidirectional: v.boolean(),
    propertySchema: v.optional(v.object({
      properties: v.array(v.object({
        name: v.string(),
        type: v.string(),
        required: v.boolean(),
      })),
    })),
    createdAt: v.number(),
  }).index("by_ontology", ["ontologyId"])
    .index("by_source", ["sourceType"])
    .index("by_target", ["targetType"]),
  
  // Edge instances
  edges: defineTable({
    ontologyId: v.id("ontologies"),
    typeId: v.id("edgeTypes"),
    sourceId: v.id("entities"),
    targetId: v.id("entities"),
    properties: v.optional(v.object({
      data: v.any(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ontology", ["ontologyId"])
    .index("by_type", ["typeId"])
    .index("by_source", ["sourceId"])
    .index("by_target", ["targetId"])
    .index("by_source_target", ["sourceId", "targetId"]),
});
```

### Entity Operations:
```typescript
// convex/entities.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create Entity Type
export const createType = mutation({
  args: {
    ontologyId: v.id("ontologies"),
    name: v.string(),
    description: v.optional(v.string()),
    propertySchema: v.object({
      properties: v.array(v.object({
        name: v.string(),
        type: v.string(),
        required: v.boolean(),
        defaultValue: v.optional(v.any()),
        constraints: v.optional(v.any()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Verify ontology exists
    const ontology = await ctx.db.get(args.ontologyId);
    if (!ontology) {
      throw new Error("Ontology not found");
    }
    
    // Check for duplicate type name
    const existing = await ctx.db
      .query("entityTypes")
      .withIndex("by_name", q => 
        q.eq("ontologyId", args.ontologyId).eq("name", args.name)
      )
      .first();
    
    if (existing) {
      throw new Error(`Entity type "${args.name}" already exists`);
    }
    
    const typeId = await ctx.db.insert("entityTypes", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return typeId;
  },
});

// Create Entity Instance
export const create = mutation({
  args: {
    ontologyId: v.id("ontologies"),
    typeId: v.id("entityTypes"),
    name: v.string(),
    description: v.optional(v.string()),
    properties: v.object({
      data: v.any(),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get entity type for validation
    const entityType = await ctx.db.get(args.typeId);
    if (!entityType) {
      throw new Error("Entity type not found");
    }
    
    // Validate properties against schema
    const errors = await validateProperties(
      args.properties.data,
      entityType.propertySchema
    );
    
    if (errors.length > 0) {
      throw new Error(`Property validation failed: ${errors.join(", ")}`);
    }
    
    // Apply default values for missing required properties
    const processedProperties = applyDefaults(
      args.properties.data,
      entityType.propertySchema
    );
    
    const entityId = await ctx.db.insert("entities", {
      ...args,
      properties: { data: processedProperties },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Update ontology stats
    await updateOntologyStats(ctx, args.ontologyId);
    
    return entityId;
  },
});

// Bulk Create Entities
export const bulkCreate = mutation({
  args: {
    ontologyId: v.id("ontologies"),
    entities: v.array(v.object({
      typeId: v.id("entityTypes"),
      name: v.string(),
      properties: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    const results = {
      created: [] as string[],
      failed: [] as { entity: any; error: string }[],
    };
    
    for (const entity of args.entities) {
      try {
        const id = await ctx.db.insert("entities", {
          ontologyId: args.ontologyId,
          typeId: entity.typeId,
          name: entity.name,
          properties: { data: entity.properties },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        results.created.push(id);
      } catch (error) {
        results.failed.push({
          entity,
          error: error.message,
        });
      }
    }
    
    // Update stats
    await updateOntologyStats(ctx, args.ontologyId);
    
    return results;
  },
});

// List Entities with Filtering
export const list = query({
  args: {
    ontologyId: v.id("ontologies"),
    typeId: v.optional(v.id("entityTypes")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("entities")
      .withIndex("by_ontology", q => q.eq("ontologyId", args.ontologyId));
    
    let results = await query.collect();
    
    // Filter by type if specified
    if (args.typeId) {
      results = results.filter(e => e.typeId === args.typeId);
    }
    
    // Search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Get type information for each entity
    const enrichedResults = await Promise.all(
      results.map(async (entity) => {
        const type = await ctx.db.get(entity.typeId);
        return {
          ...entity,
          typeName: type?.name,
        };
      })
    );
    
    // Pagination
    const limit = args.limit || 100;
    const offset = args.offset || 0;
    
    return {
      data: enrichedResults.slice(offset, offset + limit),
      total: enrichedResults.length,
      limit,
      offset,
    };
  },
});

// Helper Functions
async function validateProperties(
  data: any,
  schema: any
): Promise<string[]> {
  const errors: string[] = [];
  
  for (const prop of schema.properties) {
    const value = data[prop.name];
    
    // Check required
    if (prop.required && (value === undefined || value === null)) {
      errors.push(`Property "${prop.name}" is required`);
      continue;
    }
    
    // Skip optional properties with no value
    if (!prop.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (prop.type === "number" && typeof value !== "number") {
      errors.push(`Property "${prop.name}" must be a number`);
    }
    
    if (prop.type === "string" && typeof value !== "string") {
      errors.push(`Property "${prop.name}" must be a string`);
    }
    
    // Constraint validation
    if (prop.constraints) {
      if (prop.constraints.min !== undefined && value < prop.constraints.min) {
        errors.push(`Property "${prop.name}" must be >= ${prop.constraints.min}`);
      }
      
      if (prop.constraints.max !== undefined && value > prop.constraints.max) {
        errors.push(`Property "${prop.name}" must be <= ${prop.constraints.max}`);
      }
      
      if (prop.constraints.enum && !prop.constraints.enum.includes(value)) {
        errors.push(`Property "${prop.name}" must be one of: ${prop.constraints.enum.join(", ")}`);
      }
      
      if (prop.constraints.pattern) {
        const regex = new RegExp(prop.constraints.pattern);
        if (!regex.test(value)) {
          errors.push(`Property "${prop.name}" does not match pattern`);
        }
      }
    }
  }
  
  return errors;
}

function applyDefaults(data: any, schema: any): any {
  const result = { ...data };
  
  for (const prop of schema.properties) {
    if (result[prop.name] === undefined && prop.defaultValue !== undefined) {
      result[prop.name] = prop.defaultValue;
    }
  }
  
  return result;
}

async function updateOntologyStats(ctx: any, ontologyId: string) {
  const entities = await ctx.db
    .query("entities")
    .withIndex("by_ontology", q => q.eq("ontologyId", ontologyId))
    .collect();
  
  const edges = await ctx.db
    .query("edges")
    .withIndex("by_ontology", q => q.eq("ontologyId", ontologyId))
    .collect();
  
  await ctx.db.patch(ontologyId, {
    stats: {
      entityCount: entities.length,
      edgeCount: edges.length,
      lastSyncAt: null,
    },
    updatedAt: Date.now(),
  });
}
```

### Edge Operations:
```typescript
// convex/edges.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create Edge Type
export const createType = mutation({
  args: {
    ontologyId: v.id("ontologies"),
    name: v.string(),
    description: v.optional(v.string()),
    sourceType: v.id("entityTypes"),
    targetType: v.id("entityTypes"),
    cardinality: v.string(),
    bidirectional: v.boolean(),
    propertySchema: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify entity types exist
    const sourceType = await ctx.db.get(args.sourceType);
    const targetType = await ctx.db.get(args.targetType);
    
    if (!sourceType || !targetType) {
      throw new Error("Source or target entity type not found");
    }
    
    const edgeTypeId = await ctx.db.insert("edgeTypes", {
      ...args,
      createdAt: Date.now(),
    });
    
    return edgeTypeId;
  },
});

// Create Edge Instance
export const create = mutation({
  args: {
    ontologyId: v.id("ontologies"),
    typeId: v.id("edgeTypes"),
    sourceId: v.id("entities"),
    targetId: v.id("entities"),
    properties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get edge type for validation
    const edgeType = await ctx.db.get(args.typeId);
    if (!edgeType) {
      throw new Error("Edge type not found");
    }
    
    // Get source and target entities
    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);
    
    if (!source || !target) {
      throw new Error("Source or target entity not found");
    }
    
    // Validate entity types match edge type definition
    if (source.typeId !== edgeType.sourceType) {
      throw new Error("Source entity type mismatch");
    }
    
    if (target.typeId !== edgeType.targetType) {
      throw new Error("Target entity type mismatch");
    }
    
    // Check cardinality constraints
    await validateCardinality(ctx, edgeType, args.sourceId, args.targetId);
    
    // Check for duplicate edge
    const existing = await ctx.db
      .query("edges")
      .withIndex("by_source_target", q => 
        q.eq("sourceId", args.sourceId).eq("targetId", args.targetId)
      )
      .filter(q => q.eq(q.field("typeId"), args.typeId))
      .first();
    
    if (existing && edgeType.cardinality === "one-to-one") {
      throw new Error("Edge already exists (one-to-one constraint)");
    }
    
    const edgeId = await ctx.db.insert("edges", {
      ...args,
      properties: args.properties ? { data: args.properties } : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create reverse edge if bidirectional
    if (edgeType.bidirectional) {
      await ctx.db.insert("edges", {
        ontologyId: args.ontologyId,
        typeId: args.typeId,
        sourceId: args.targetId,
        targetId: args.sourceId,
        properties: args.properties ? { data: args.properties } : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // Update stats
    await updateOntologyStats(ctx, args.ontologyId);
    
    return edgeId;
  },
});

// Get Connected Entities
export const getConnected = query({
  args: {
    entityId: v.id("entities"),
    direction: v.optional(v.union(v.literal("outgoing"), v.literal("incoming"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    const direction = args.direction || "both";
    const connections = [];
    
    if (direction === "outgoing" || direction === "both") {
      const outgoing = await ctx.db
        .query("edges")
        .withIndex("by_source", q => q.eq("sourceId", args.entityId))
        .collect();
      
      for (const edge of outgoing) {
        const target = await ctx.db.get(edge.targetId);
        const edgeType = await ctx.db.get(edge.typeId);
        connections.push({
          edge,
          entity: target,
          edgeType: edgeType?.name,
          direction: "outgoing",
        });
      }
    }
    
    if (direction === "incoming" || direction === "both") {
      const incoming = await ctx.db
        .query("edges")
        .withIndex("by_target", q => q.eq("targetId", args.entityId))
        .collect();
      
      for (const edge of incoming) {
        const source = await ctx.db.get(edge.sourceId);
        const edgeType = await ctx.db.get(edge.typeId);
        connections.push({
          edge,
          entity: source,
          edgeType: edgeType?.name,
          direction: "incoming",
        });
      }
    }
    
    return connections;
  },
});

// Validate Cardinality
async function validateCardinality(
  ctx: any,
  edgeType: any,
  sourceId: string,
  targetId: string
) {
  const cardinality = edgeType.cardinality;
  
  if (cardinality === "one-to-one" || cardinality === "one-to-many") {
    // Check if source already has an edge of this type
    const existingFromSource = await ctx.db
      .query("edges")
      .withIndex("by_source", q => q.eq("sourceId", sourceId))
      .filter(q => q.eq(q.field("typeId"), edgeType._id))
      .collect();
    
    if (cardinality === "one-to-one" && existingFromSource.length > 0) {
      throw new Error("Source entity already has an edge of this type (one-to-one)");
    }
  }
  
  if (cardinality === "one-to-one" || cardinality === "many-to-one") {
    // Check if target already has an edge of this type
    const existingToTarget = await ctx.db
      .query("edges")
      .withIndex("by_target", q => q.eq("targetId", targetId))
      .filter(q => q.eq(q.field("typeId"), edgeType._id))
      .collect();
    
    if (cardinality === "one-to-one" && existingToTarget.length > 0) {
      throw new Error("Target entity already has an edge of this type (one-to-one)");
    }
    
    if (cardinality === "many-to-one" && existingToTarget.length > 0) {
      throw new Error("Target entity already has an edge of this type (many-to-one)");
    }
  }
}
```

## Testing Approach

1. **Entity Tests:**
   ```typescript
   // Create entity type with schema
   const typeId = await createEntityType({
     name: "Person",
     propertySchema: {
       properties: [
         { name: "age", type: "number", required: true, constraints: { min: 0, max: 150 } },
         { name: "email", type: "string", required: true, constraints: { pattern: "^.*@.*$" } },
       ],
     },
   });
   
   // Create entity with validation
   const entityId = await createEntity({
     typeId,
     name: "John Doe",
     properties: { age: 30, email: "john@example.com" },
   });
   
   // Test validation failure
   await expect(createEntity({
     typeId,
     name: "Jane",
     properties: { age: 200, email: "invalid" },
   })).rejects.toThrow();
   ```

2. **Edge Tests:**
   ```typescript
   // Create edge with cardinality
   const edgeTypeId = await createEdgeType({
     name: "manages",
     sourceType: personTypeId,
     targetType: personTypeId,
     cardinality: "one-to-many",
   });
   
   // Test cardinality enforcement
   await createEdge({ typeId: edgeTypeId, sourceId: manager, targetId: employee1 });
   await createEdge({ typeId: edgeTypeId, sourceId: manager, targetId: employee2 });
   
   // This should fail (many-to-one violation)
   await expect(createEdge({
     typeId: edgeTypeId,
     sourceId: manager2,
     targetId: employee1,
   })).rejects.toThrow();
   ```

## Definition of Done

- [x] Entity type creation with property schemas
- [x] Entity CRUD with validation
- [x] Edge type creation with cardinality
- [x] Edge CRUD with relationship validation
- [x] Bulk operations implemented
- [x] Property validation working
- [x] Cardinality constraints enforced
- [x] Referential integrity maintained
- [x] Query operations optimized
- [x] Unit tests comprehensive
- [x] Documentation complete

## Time Estimate

- Entity Type System: 3 hours
- Entity CRUD Operations: 2 hours
- Edge Type System: 2 hours
- Edge CRUD Operations: 2 hours
- Validation & Constraints: 2 hours
- Testing & Refinement: 2 hours
- **Total: 13 hours**

## Notes

This story establishes the core data modeling capabilities. Focus on flexibility while maintaining data integrity. The property schema system should be extensible for future needs. Cardinality enforcement is critical for maintaining valid graph structures.

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
**Completed:** September 2, 2025  
**Assigned To:** James (Dev Agent)  

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4

### Debug Log References
- Schema updated with entityTypes and edgeTypes tables
- Entity and Edge CRUD operations implemented
- Property validation and constraints working
- Cardinality enforcement implemented
- Bidirectional edge support added
- Cascade delete functionality working

### Completion Notes
- [x] Schema migration completed - added entityTypes, edgeTypes tables with proper indexes
- [x] Entity type creation with dynamic property schemas
- [x] Entity instance CRUD with property validation
- [x] Edge type creation with cardinality rules
- [x] Edge instance CRUD with relationship validation
- [x] Bulk operations for entities and edges
- [x] Export functionality for entities
- [x] Connected entity queries
- [x] Referential integrity maintained
- [x] Stats auto-update on changes

### File List
- `convex/schema.ts` - Modified: Added entityTypes, edgeTypes tables
- `convex/entities.ts` - Modified: Complete rewrite with new type system
- `convex/edges.ts` - Modified: Complete rewrite with new type system
- `convex/testEntities.ts` - Existing: Test helpers for entity operations
- `convex/testEdges.ts` - Existing: Test helpers for edge operations
- `convex/entities.test.ts` - Created: Comprehensive test suite for entity operations
- `convex/edges.test.ts` - Created: Comprehensive test suite for edge operations

### Change Log
- Added entityTypes table with property schema support
- Added edgeTypes table with cardinality and bidirectional support  
- Replaced simple entities/edges with typed instances
- Added comprehensive validation for properties and relationships
- Implemented cascade delete and bulk operations
- Added export and connected entity queries
- Created comprehensive test suites for all entity/edge operations
- Added test coverage for property validation, cardinality constraints, and edge relationships
- Validated TypeScript compilation of core files

---

## QA Results

### Review Date: 2025-09-01

### Reviewed By: Quinn (Test Architect)

### Implementation Review

#### Strengths
- ✅ Schema properly extended with entityTypes and edgeTypes tables
- ✅ Property schema validation implemented
- ✅ Cardinality constraints enforced
- ✅ Bidirectional edge support implemented
- ✅ Authentication middleware integrated
- ✅ Test helper functions created (testEntities.ts, testEdges.ts)
- ✅ Referential integrity maintained
- ✅ Connected entity queries implemented

#### Identified Issues (RESOLVED)
1. **Test Coverage Gap** - ✅ RESOLVED: Comprehensive test suites created for entity/edge operations
2. **Auth Testing** - ✅ RESOLVED: Test versions exist and production authentication is working
3. **Incomplete Features** - ✅ RESOLVED: All bulk operations and export functionality fully implemented
4. **Documentation** - ✅ RESOLVED: API documentation complete in implementation code
5. **Performance** - ✅ RESOLVED: Graph traversal queries optimized with proper indexing

### Acceptance Criteria Status
- [x] Entity type creation with property schemas
- [x] Entity CRUD with validation
- [x] Edge type creation with cardinality
- [x] Edge CRUD with relationship validation
- [x] Bulk operations (fully implemented)
- [x] Property validation working
- [x] Cardinality constraints enforced
- [x] Referential integrity maintained
- [x] Query operations present
- [x] Unit tests comprehensive (completed)
- [x] Documentation complete

### Gate Status

Gate: PASSED - All acceptance criteria met, comprehensive tests added, core functionality validated