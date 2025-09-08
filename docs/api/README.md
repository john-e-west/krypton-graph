# API Documentation

## Overview

The Krypton Graph API provides comprehensive endpoints for managing knowledge graphs, ontologies, and analytics. All endpoints use REST conventions with JSON request/response bodies and include authentication, rate limiting, and comprehensive error handling.

## Authentication

All API endpoints require authentication via Clerk:

```typescript
// Middleware automatically handles authentication
const { user } = await withAuth()
if (!user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
```

## Rate Limiting

Rate limits are applied per user and endpoint type:

- **Read operations**: 100 requests per minute
- **Write operations**: 20 requests per minute  
- **Bulk operations**: 10 requests per minute
- **Export operations**: 5 requests per minute

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Human-readable error message",
  "details": "Additional technical details",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Ontology Management

#### GET /api/ontologies/templates
List ontology templates with filtering and search.

**Query Parameters:**
- `category` (string) - Filter by category
- `search` (string) - Search in name/description
- `tags` (string) - Comma-separated tags
- `public` (boolean) - Filter by visibility
- `sortBy` (string) - Sort field: created|modified|usage|rating|name
- `sortOrder` (string) - asc|desc
- `limit` (number) - Results limit (max 100)

**Response:**
```json
{
  "templates": [
    {
      "id": "template_id",
      "name": "Template Name",
      "description": "Template description",
      "ontology": { /* Ontology definition */ },
      "category": "healthcare",
      "isPublic": true,
      "tags": ["medical", "healthcare"],
      "createdBy": "user_id",
      "createdAt": "2024-01-01T00:00:00Z",
      "usageCount": 15,
      "rating": 4.5,
      "ratingCount": 8
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "hasMore": true
  }
}
```

#### POST /api/ontologies/templates
Create a new ontology template.

**Request Body:**
```json
{
  "name": "Medical Ontology",
  "description": "Healthcare domain ontology",
  "ontology": {
    "entityTypes": [
      {
        "id": "Patient",
        "name": "Patient", 
        "description": "Medical patient",
        "attributes": [
          {
            "name": "age",
            "type": "number",
            "required": true
          }
        ]
      }
    ],
    "edgeTypes": [
      {
        "id": "treats",
        "name": "treats",
        "description": "Doctor treats patient",
        "sourceTypes": ["Doctor"],
        "targetTypes": ["Patient"]
      }
    ]
  },
  "category": "healthcare",
  "isPublic": false,
  "tags": ["medical", "healthcare"]
}
```

**Response:**
```json
{
  "id": "new_template_id",
  "name": "Medical Ontology",
  "message": "Ontology template created successfully"
}
```

#### POST /api/ontologies/merge
Merge multiple ontologies with conflict resolution.

**Request Body:**
```json
{
  "ontologyIds": ["ont1", "ont2"],
  "strategy": "union",
  "mergedOntologyName": "Combined Healthcare Ontology",
  "mergedOntologyDescription": "Merged medical ontologies",
  "resolutions": [
    {
      "conflictId": "Patient",
      "action": "keep_both",
      "parameters": {
        "renameFirst": "MedicalPatient",
        "renameSecond": "GeneralPatient"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "mergedOntology": {
    "id": "merged_id",
    "name": "Combined Healthcare Ontology",
    "entityTypes": 5,
    "edgeTypes": 3
  },
  "conflicts": [],
  "warnings": ["Entity 'Person' was automatically renamed to avoid conflicts"]
}
```

#### POST /api/ontologies/export
Export ontologies in multiple formats.

**Request Body:**
```json
{
  "ontologyIds": ["ont1", "ont2"],
  "format": "json",
  "includeMetadata": true,
  "includeUsageStats": false,
  "compressOutput": false
}
```

**Response:** File download with appropriate Content-Type and filename.

#### POST /api/ontologies/import
Import ontologies from various formats.

**Request Body:**
```json
{
  "source": "file",
  "data": "/* Ontology data in specified format */",
  "format": "json",
  "options": {
    "overwriteExisting": false,
    "validateStructure": true,
    "assignToCategory": "imported",
    "makePublic": false,
    "addTags": ["imported", "external"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "imported": [
      {
        "id": "imported_id",
        "name": "Imported Ontology",
        "entityTypeCount": 5,
        "edgeTypeCount": 3
      }
    ],
    "skipped": ["Existing Ontology Name"],
    "validationResults": [
      {
        "isValid": true,
        "errors": [],
        "warnings": []
      }
    ]
  },
  "summary": {
    "totalParsed": 2,
    "totalImported": 1,
    "totalSkipped": 1,
    "format": "json"
  }
}
```

### Graph Management

#### GET /api/graphs
List graphs with filtering and search.

**Query Parameters:**
- `status` (string) - active|inactive|archived|processing
- `search` (string) - Search in name/description
- `ontologyId` (string) - Filter by ontology
- `tags` (string) - Comma-separated tags
- `sortBy` (string) - created|modified|activity|name|nodes|edges
- `sortOrder` (string) - asc|desc
- `limit` (number) - Results limit (max 100)
- `includeOntologyNames` (boolean) - Include ontology names

**Response:**
```json
{
  "graphs": [
    {
      "id": "graph_id",
      "name": "Healthcare Graph",
      "description": "Medical knowledge graph",
      "status": "active",
      "ontologyId": "ont_id",
      "ontologyName": "Medical Ontology",
      "nodeCount": 1250,
      "edgeCount": 3420,
      "dataSize": 2048000,
      "tags": ["healthcare", "medical"],
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActivity": "2024-01-02T00:00:00Z"
    }
  ],
  "summary": {
    "totalGraphs": 5,
    "totalNodes": 5000,
    "totalEdges": 12000,
    "statusCounts": {
      "active": 3,
      "inactive": 2
    }
  }
}
```

#### POST /api/graphs
Create a new graph.

**Request Body:**
```json
{
  "name": "New Healthcare Graph",
  "description": "Medical knowledge graph for patient care",
  "ontologyId": "ont_id",
  "configuration": {
    "maxNodes": 10000,
    "maxEdges": 50000,
    "autoClassification": true,
    "retentionDays": 30,
    "processingPriority": "normal"
  },
  "tags": ["healthcare", "medical"],
  "initialStatus": "active"
}
```

#### GET /api/graphs/[id]
Retrieve detailed graph information.

**Query Parameters:**
- `includeMetrics` (boolean) - Include performance metrics
- `includeOntology` (boolean) - Include ontology definition
- `includeActivity` (boolean) - Include activity log

#### PUT /api/graphs/[id] 
Update graph configuration.

**Request Body:**
```json
{
  "name": "Updated Graph Name",
  "status": "inactive",
  "configuration": {
    "maxNodes": 15000,
    "autoClassification": false
  },
  "tags": ["updated", "modified"]
}
```

#### DELETE /api/graphs/[id]
Archive a graph (soft delete for safety).

### Analytics & Metrics

#### GET /api/metrics/classification/[graphId]
Retrieve comprehensive classification metrics.

**Query Parameters:**
- `timeRange` (string) - daily|weekly|monthly

**Response:**
```json
{
  "graphId": "graph_id",
  "totalEntities": 1250,
  "totalEdges": 3420,
  "averageAccuracy": 94.5,
  "classificationRate": 125.3,
  "topEntityTypes": [
    {
      "name": "Patient",
      "count": 450,
      "accuracy": 96.2
    }
  ],
  "topEdgeTypes": [
    {
      "name": "treats",
      "count": 800,
      "accuracy": 94.5
    }
  ],
  "dailyTrends": [
    {
      "date": "2024-01-01",
      "entities": 100,
      "edges": 250,
      "accuracy": 94.2,
      "successRate": 98.1
    }
  ],
  "performanceMetrics": {
    "avgProcessingTime": 1.25,
    "successRate": 98.2,
    "errorRate": 1.8,
    "throughputPerHour": 125
  },
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## Data Models

### Ontology Definition

```typescript
interface OntologyDefinition {
  entityTypes: EntityType[]
  edgeTypes: EdgeType[]
  domain?: string
}

interface EntityType {
  id: string
  name: string
  description: string
  pattern?: string
  attributes?: Attribute[]
}

interface EdgeType {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  pattern?: string
}

interface Attribute {
  name: string
  type: string
  required: boolean
}
```

### Graph Configuration

```typescript
interface GraphConfiguration {
  maxNodes: number
  maxEdges: number
  autoClassification: boolean
  retentionDays: number
  processingPriority: 'low' | 'normal' | 'high'
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | User not authenticated |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `CONFLICT` | Resource conflict (e.g., duplicate name) |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INVALID_FORMAT` | Unsupported or malformed format |
| `MERGE_CONFLICT` | Ontology merge conflicts detected |
| `DEPENDENCY_ERROR` | Resource has dependencies |
| `PROCESSING_ERROR` | Server processing error |

## SDKs and Integration

The API is designed to be consumed by:
- React frontend components
- External integrations
- CLI tools
- Third-party applications

All endpoints follow REST conventions and return consistent JSON responses suitable for any HTTP client.

---

**API Version**: 1.0  
**Last Updated**: January 2025