# Custom Type Management UI/UX Specification

## Overview

This document specifies the user interface for managing custom entity and edge types in Krypton Graph, aligned with Zep's v3 Graph API constraints and the document-driven workflow approach.

---

## Main Custom Types Dashboard

### Purpose
Central hub for viewing, managing, and optimizing custom types across all knowledge graphs.

### Design

```
┌─────────────────────────────────────────────────────────────┐
│ Custom Types Management                    [+ New] [Import]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Zep Limits: 7/10 Entity Types | 4/10 Edge Types             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ Tabs: [All Types] [Entity Types] [Edge Types] [Unclassified] │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Entity Types                              Usage | Action │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🏥 Researcher                               12 | [Edit] │ │
│ │    Scientists and medical researchers              ⋮     │ │
│ │                                                           │ │
│ │ 💊 MedicalProduct                            8 | [Edit] │ │
│ │    Diagnostic tests, drugs, treatments             ⋮     │ │
│ │                                                           │ │
│ │ 🧬 Hormone                                   4 | [Edit] │ │
│ │    Biological hormones (hepatalin, insulin)        ⋮     │ │
│ │                                                           │ │
│ │ 🧪 TestProcedure                             3 | [Edit] │ │
│ │    Medical tests and research protocols            ⋮     │ │
│ │                                                           │ │
│ │ + Default Types (Organization, Location, etc.)           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Edge Types                               Usage | Action  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ → DISCOVERED                                15 | [Edit] │ │
│ │    Scientific discovery relationship               ⋮     │ │
│ │                                                           │ │
│ │ → TREATS                                    10 | [Edit] │ │
│ │    Treatment for medical condition                 ⋮     │ │
│ │                                                           │ │
│ │ → MEASURES                                   8 | [Edit] │ │
│ │    Diagnostic measurement                          ⋮     │ │
│ │                                                           │ │
│ │ + Default Types (WorksFor, LocatedAt, etc.)             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Optimize Types] [Export Schema] [View Analytics]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Type Creation Wizard

### Step 1: Choose Type Category

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Custom Type                     Step 1 of 4       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ What type of item do you want to define?                     │
│                                                               │
│ ┌───────────────────┐  ┌───────────────────┐                │
│ │                   │  │                   │                │
│ │   📦 Entity       │  │   🔗 Edge         │                │
│ │                   │  │                   │                │
│ │ Things that exist │  │  Relationships    │                │
│ │ (Nouns: Person,   │  │  between things   │                │
│ │  Product, Place)  │  │  (Verbs: OWNS,    │                │
│ │                   │  │   WORKS_AT)       │                │
│ │     [Select]      │  │     [Select]      │                │
│ └───────────────────┘  └───────────────────┘                │
│                                                               │
│ 💡 Tip: Entities are the "things" in your data, edges are    │
│        the "relationships" between those things.             │
│                                                               │
│                                              [Cancel]        │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Define Basic Properties

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Entity Type                     Step 2 of 4       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Basic Information                                            │
│                                                               │
│ Type Name (PascalCase):                                      │
│ [MedicalProduct                                        ]     │
│                                                               │
│ Description (for AI classification):                         │
│ [A medical product, diagnostic tool, or therapeutic         ]│
│ [intervention developed for healthcare applications.        ]│
│                                                               │
│ Priority Note (optional):                                    │
│ [Use this instead of generic 'Product' for medical items   ]│
│                                                               │
│ Category/Domain:                                             │
│ [▼ Medical/Healthcare                                  ]     │
│                                                               │
│ Examples from your documents:                                │
│ • NuPa Test (diagnostic test)                               │
│ • NuPa Daily (nutraceutical)                                │
│ • NuPa Renew (drug in development)                          │
│                                                               │
│                                [← Back] [Next: Attributes →] │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Define Attributes

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Entity Type                     Step 3 of 4       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Define Attributes (0/10 used)                                │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Attribute Name     Type    Description                  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ product_type      [Text ▼] Type: diagnostic test,       │ │
│ │                            drug, nutraceutical          │ │
│ │                                                   [🗑️]   │ │
│ │                                                          │ │
│ │ development_stage [Text ▼] Stage: research, trials,     │ │
│ │                            approved, marketed           │ │
│ │                                                   [🗑️]   │ │
│ │                                                          │ │
│ │ target_condition  [Text ▼] Medical condition this       │ │
│ │                            product addresses            │ │
│ │                                                   [🗑️]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [+ Add Attribute]                                            │
│                                                               │
│ Available Types: Text, Boolean, Number                       │
│                                                               │
│ ⚠️ Reserved names to avoid: uuid, name, graph_id, summary    │
│                                                               │
│                                  [← Back] [Next: Preview →]  │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Preview & Confirm

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Entity Type                     Step 4 of 4       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Preview Your Custom Type                                     │
│                                                               │
│ Generated Python Code:                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ class MedicalProduct(EntityModel):                       │ │
│ │     """                                                  │ │
│ │     A medical product, diagnostic tool, or therapeutic   │ │
│ │     intervention developed for healthcare applications.  │ │
│ │     """                                                  │ │
│ │     product_type: EntityText = Field(                   │ │
│ │         description="Type: diagnostic test, drug...",   │ │
│ │         default=None                                    │ │
│ │     )                                                   │ │
│ │     development_stage: EntityText = Field(              │ │
│ │         description="Stage: research, trials...",       │ │
│ │         default=None                                    │ │
│ │     )                                                   │ │
│ │     target_condition: EntityText = Field(               │ │
│ │         description="Medical condition addressed",      │ │
│ │         default=None                                    │ │
│ │     )                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ This type will be immediately available for classification   │
│                                                               │
│                            [← Back] [Create Type] [Cancel]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Unclassified Items Manager

### Purpose
Help users understand and resolve unclassified entities and edges.

### Design

```
┌─────────────────────────────────────────────────────────────┐
│ Unclassified Items                         5 items pending   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filter: [All] [Entities] [Edges] | Sort: [Frequency ▼]       │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Unclassified Entities (2)                               │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                          │ │
│ │ □ "Health Canada" (3 occurrences)                       │ │
│ │   Context: "Clinical trials approved by Health Canada"   │ │
│ │   Suggested Type: RegulatoryBody                        │ │
│ │   [Create Type] [Classify As...] [Ignore]               │ │
│ │                                                          │ │
│ │ □ "S-adenosyl-L-methionine" (2 occurrences)             │ │
│ │   Context: "Formula contains S-adenosyl-L-methionine"   │ │
│ │   Suggested Type: ChemicalCompound                      │ │
│ │   [Create Type] [Classify As...] [Ignore]               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Unclassified Edges (3)                                  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │                                                          │ │
│ │ □ APPROVED_BY (TestProcedure → "Health Canada")         │ │
│ │   4 occurrences                                         │ │
│ │   [Create Edge Type] [Map to Existing] [Ignore]         │ │
│ │                                                          │ │
│ │ □ CONTAINS (Product → "S-adenosyl-L-methionine")        │ │
│ │   2 occurrences                                         │ │
│ │   [Create Edge Type] [Map to Existing] [Ignore]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Create Suggested Types] [Review All] [Export Report]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Type Analytics Dashboard

### Purpose
Provide insights into type usage and optimization opportunities.

### Design

```
┌─────────────────────────────────────────────────────────────┐
│ Custom Type Analytics                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Classification Performance                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Overall: 94.3% classified                               │ │
│ │ ████████████████████░░ Entities: 95.7% (45/47)         │ │
│ │ ███████████████████░░░ Edges: 96.8% (61/63)            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Type Utilization                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Most Used Entity Types            Least Used            │ │
│ │ 1. Researcher (12)                1. ResearchSubject (2)│ │
│ │ 2. MedicalProduct (8)             2. BiologicalProcess(2)│ │
│ │ 3. Organization (6)               3. TestProcedure (3)  │ │
│ │                                                          │ │
│ │ Most Used Edge Types              Unused Types          │ │
│ │ 1. DISCOVERED (15)                None                  │ │
│ │ 2. TREATS (10)                                          │ │
│ │ 3. MEASURES (8)                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Optimization Suggestions                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💡 Consider merging similar types:                      │ │
│ │    • TestProcedure + DiagnosticTest → MedicalTest      │ │
│ │                                                          │ │
│ │ 📊 Low-usage types to review:                          │ │
│ │    • ResearchSubject (only 2 instances)                │ │
│ │                                                          │ │
│ │ ⚠️ Approaching Zep limit:                               │ │
│ │    • 7/10 entity types used                            │ │
│ │    • Consider consolidation before adding new types    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Export Report] [Optimize Types] [View Details]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Type Comparison View

### Purpose
Compare custom types across different knowledge graphs to find reuse opportunities.

### Design

```
┌─────────────────────────────────────────────────────────────┐
│ Type Comparison: Current vs. "Diabetes Research Network"     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Matching Types (Use Same Definition)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ Researcher      - Identical structure                │ │
│ │ ✅ Hormone         - Identical structure                │ │
│ │ ✅ MedicalCondition - Identical structure               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Similar Types (Consider Alignment)                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ MedicalProduct ≈ DrugProduct                         │ │
│ │    Your version has: product_type, development_stage    │ │
│ │    Their version has: drug_class, fda_status           │ │
│ │    [View Differences] [Adopt Theirs] [Keep Yours]      │ │
│ │                                                          │ │
│ │ ⚠️ TestProcedure ≈ ClinicalTest                        │ │
│ │    Your version has: test_type, measures               │ │
│ │    Their version has: trial_phase, endpoints           │ │
│ │    [View Differences] [Adopt Theirs] [Keep Yours]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Your Unique Types (Not in target KG)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🆕 BiologicalProcess - No equivalent found              │ │
│ │ 🆕 ResearchSubject - No equivalent found                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Missing Types (In target but not yours)                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ❌ PatientRecord - Consider adding                      │ │
│ │ ❌ ClinicalTrial - Consider adding                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [Align Types] [Import to Target] [Create New KG]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Actions Menu

### Floating Action Button
```
┌────┐
│ ⚡ │  → Create from Document
└────┘     → Add Custom Type
           → Import Ontology
           → View Unclassified
```

---

## Responsive Mobile View

### Custom Types List (Mobile)
```
┌─────────────────────────┐
│ Custom Types        [+] │
├─────────────────────────┤
│ 7/10 Entity | 4/10 Edge │
├─────────────────────────┤
│ ┌───────────────────────┐
│ │ Researcher       (12) │
│ │ Scientists & medical  │
│ │                  [>]  │
│ ├───────────────────────┤
│ │ MedicalProduct    (8) │
│ │ Tests, drugs, ...     │
│ │                  [>]  │
│ ├───────────────────────┤
│ │ Hormone           (4) │
│ │ Biological hormones   │
│ │                  [>]  │
│ └───────────────────────┘
│                          │
│ [View All] [Analytics]   │
└─────────────────────────┘
```

---

## Design Principles

### Visual Hierarchy
1. **Type limits prominently displayed** - Users always see Zep constraints
2. **Usage counts visible** - Help identify important vs. unused types
3. **Classification rate** - Key metric always visible
4. **Examples from documents** - Context for understanding types

### Interaction Patterns
1. **Progressive disclosure** - Start simple, reveal complexity
2. **Guided workflows** - Step-by-step for complex tasks
3. **Bulk operations** - Handle multiple items efficiently
4. **Contextual help** - Tooltips and examples throughout

### Color Coding
- 🟢 **Green**: Classified, optimal, good performance
- 🟡 **Yellow**: Warning, approaching limits, needs review
- 🔴 **Red**: Unclassified, errors, over limits
- 🔵 **Blue**: Information, suggestions, help

### Accessibility
- WCAG AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode available

---

## Implementation Notes

### React Components Structure
```
src/components/custom-types/
├── CustomTypesManager.tsx       // Main container
├── TypeCreationWizard.tsx       // Multi-step creation
├── UnclassifiedItemsPanel.tsx   // Handle unclassified
├── TypeAnalyticsDashboard.tsx   // Usage analytics
├── TypeComparisonView.tsx       // Compare ontologies
├── TypeEditor.tsx               // Edit existing types
├── TypeList.tsx                 // List view component
└── TypeLimitIndicator.tsx       // Zep limit display
```

### State Management
```typescript
interface CustomTypeState {
  entityTypes: CustomEntityType[];
  edgeTypes: CustomEdgeType[];
  unclassifiedEntities: UnclassifiedItem[];
  unclassifiedEdges: UnclassifiedItem[];
  zepLimits: {
    maxEntityTypes: 10;
    maxEdgeTypes: 10;
    currentEntityTypes: number;
    currentEdgeTypes: number;
  };
  classificationRate: {
    entities: number;
    edges: number;
    overall: number;
  };
}
```

---

## User Journey Example

1. **Upload Document** → System analyzes content
2. **Review Suggested Types** → Modify if needed
3. **Import to KG** → See classification results
4. **Handle Unclassified** → Create additional types
5. **Optimize Types** → Merge similar, remove unused
6. **Find Similar KGs** → Reuse or create new
7. **Monitor Usage** → Track performance over time

This UI design ensures users can effectively manage custom types within Zep's constraints while maintaining high classification rates and data quality.