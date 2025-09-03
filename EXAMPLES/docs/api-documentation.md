# API Documentation
## Krypton-Graph REST API Reference

**Version:** 1.0  
**Base URL:** `https://api.krypton-graph.com/v1`  
**Authentication:** Bearer token (JWT)

---

## Authentication

All API requests must include an authentication token in the header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "admin",
    "permissions": ["ontology:write", "test:execute"]
  }
}
```

---

## Ontology Management

### List Ontologies

```http
GET /ontologies
```

**Query Parameters:**
- `domain` (string, optional): Filter by domain
- `status` (string, optional): Filter by status (Draft, Testing, Published, Deprecated)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "ont_abc123",
      "name": "Healthcare Ontology",
      "domain": "Healthcare",
      "version": "1.0.0",
      "status": "Published",
      "description": "Medical entity and relationship definitions",
      "created_date": "2025-09-01T10:00:00Z",
      "modified_date": "2025-09-01T12:00:00Z",
      "created_by": "user_123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Create Ontology

```http
POST /ontologies
Content-Type: application/json

{
  "name": "Finance Ontology",
  "domain": "Finance",
  "description": "Financial entity and relationship definitions",
  "version": "1.0.0"
}
```

**Response:** `201 Created`
```json
{
  "id": "ont_def456",
  "name": "Finance Ontology",
  "domain": "Finance",
  "version": "1.0.0",
  "status": "Draft",
  "description": "Financial entity and relationship definitions",
  "created_date": "2025-09-01T14:00:00Z",
  "created_by": "user_123"
}
```

### Get Ontology

```http
GET /ontologies/{ontology_id}
```

**Response:** `200 OK`
```json
{
  "id": "ont_abc123",
  "name": "Healthcare Ontology",
  "domain": "Healthcare",
  "version": "1.0.0",
  "status": "Published",
  "description": "Medical entity and relationship definitions",
  "entities": [
    {
      "id": "ent_001",
      "entity_name": "Patient",
      "entity_class": "healthcare.patient",
      "properties": {
        "required": ["name", "medical_record_number"],
        "optional": ["date_of_birth", "conditions"]
      }
    }
  ],
  "edges": [
    {
      "id": "edg_001",
      "edge_name": "TREATS",
      "source_entity": "Doctor",
      "target_entity": "Patient",
      "cardinality": "one-to-many"
    }
  ],
  "metadata": {
    "total_entities": 5,
    "total_edges": 8
  }
}
```

### Update Ontology

```http
PUT /ontologies/{ontology_id}
Content-Type: application/json

{
  "description": "Updated medical entity definitions",
  "status": "Testing"
}
```

**Response:** `200 OK`
```json
{
  "id": "ont_abc123",
  "name": "Healthcare Ontology",
  "domain": "Healthcare",
  "version": "1.0.0",
  "status": "Testing",
  "description": "Updated medical entity definitions",
  "modified_date": "2025-09-01T15:00:00Z"
}
```

### Delete Ontology

```http
DELETE /ontologies/{ontology_id}
```

**Response:** `204 No Content`

### Clone Ontology

```http
POST /ontologies/{ontology_id}/clone
Content-Type: application/json

{
  "name": "Healthcare Ontology v2",
  "version": "2.0.0"
}
```

**Response:** `201 Created`
```json
{
  "id": "ont_ghi789",
  "name": "Healthcare Ontology v2",
  "domain": "Healthcare",
  "version": "2.0.0",
  "status": "Draft",
  "cloned_from": "ont_abc123",
  "created_date": "2025-09-01T16:00:00Z"
}
```

---

## Entity Management

### List Entities

```http
GET /ontologies/{ontology_id}/entities
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "ent_001",
      "ontology_id": "ont_abc123",
      "entity_name": "Patient",
      "entity_class": "healthcare.patient",
      "properties": {
        "type": "object",
        "required": ["name", "medical_record_number"],
        "properties": {
          "name": {"type": "string"},
          "medical_record_number": {"type": "string"},
          "date_of_birth": {"type": "string", "format": "date"},
          "conditions": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      },
      "validation_rules": [
        "medical_record_number must be unique"
      ],
      "examples": [
        "John Doe, MRN: 12345",
        "Patient Jane Smith"
      ],
      "priority": 1
    }
  ]
}
```

### Create Entity

```http
POST /ontologies/{ontology_id}/entities
Content-Type: application/json

{
  "entity_name": "Medication",
  "entity_class": "healthcare.medication",
  "properties": {
    "type": "object",
    "required": ["name", "dosage"],
    "properties": {
      "name": {"type": "string"},
      "dosage": {"type": "string"},
      "frequency": {"type": "string"}
    }
  },
  "examples": [
    "Aspirin 100mg",
    "Lisinopril 10mg daily"
  ],
  "priority": 2
}
```

**Response:** `201 Created`

### Update Entity

```http
PUT /entities/{entity_id}
Content-Type: application/json

{
  "priority": 3,
  "examples": [
    "Aspirin 100mg",
    "Lisinopril 10mg daily",
    "Metformin 500mg twice daily"
  ]
}
```

**Response:** `200 OK`

### Delete Entity

```http
DELETE /entities/{entity_id}
```

**Response:** `204 No Content`

---

## Edge Management

### List Edges

```http
GET /ontologies/{ontology_id}/edges
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "edg_001",
      "ontology_id": "ont_abc123",
      "edge_name": "TREATS",
      "source_entity_id": "ent_002",
      "target_entity_id": "ent_001",
      "source_entity_name": "Doctor",
      "target_entity_name": "Patient",
      "cardinality": "one-to-many",
      "bidirectional": false,
      "properties": {
        "since": {"type": "date"},
        "primary": {"type": "boolean"}
      },
      "examples": [
        "Dr. Smith treats patient John Doe",
        "Primary physician relationship"
      ]
    }
  ]
}
```

### Create Edge

```http
POST /ontologies/{ontology_id}/edges
Content-Type: application/json

{
  "edge_name": "PRESCRIBES",
  "source_entity_id": "ent_002",
  "target_entity_id": "ent_003",
  "cardinality": "many-to-many",
  "bidirectional": false,
  "properties": {
    "date": {"type": "date"},
    "quantity": {"type": "integer"}
  },
  "examples": [
    "Doctor prescribes medication",
    "Prescription for 30-day supply"
  ]
}
```

**Response:** `201 Created`

---

## Fact Rating Configuration

### List Rating Configurations

```http
GET /rating-configs
```

**Query Parameters:**
- `ontology_id` (string, optional): Filter by ontology
- `status` (string, optional): Active, Testing, Inactive

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "cfg_001",
      "ontology_id": "ont_abc123",
      "name": "Clinical Relevance Filter",
      "instruction": "Rate the medical significance of facts",
      "high_example": "Patient has severe allergic reaction to penicillin",
      "medium_example": "Patient scheduled for routine checkup",
      "low_example": "Patient prefers morning appointments",
      "min_rating": 0.3,
      "effectiveness_score": 0.85,
      "status": "Active",
      "created_date": "2025-09-01T10:00:00Z"
    }
  ]
}
```

### Create Rating Configuration

```http
POST /rating-configs
Content-Type: application/json

{
  "ontology_id": "ont_abc123",
  "name": "Emergency Priority Filter",
  "instruction": "Rate facts by emergency medical priority",
  "high_example": "Patient experiencing chest pain and shortness of breath",
  "medium_example": "Patient has persistent cough for 2 weeks",
  "low_example": "Patient requests prescription refill",
  "min_rating": 0.4
}
```

**Response:** `201 Created`

### Test Rating Configuration

```http
POST /rating-configs/{config_id}/test
Content-Type: application/json

{
  "sample_facts": [
    "Patient admitted with acute myocardial infarction",
    "Patient's insurance card updated",
    "Blood pressure reading 180/110"
  ]
}
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "fact": "Patient admitted with acute myocardial infarction",
      "rating": 0.95,
      "category": "high"
    },
    {
      "fact": "Patient's insurance card updated",
      "rating": 0.15,
      "category": "low"
    },
    {
      "fact": "Blood pressure reading 180/110",
      "rating": 0.85,
      "category": "high"
    }
  ],
  "effectiveness_score": 0.87
}
```

---

## Testing Operations

### Run Test

```http
POST /tests/run
Content-Type: application/json

{
  "ontology_id": "ont_abc123",
  "dataset_id": "ds_001",
  "options": {
    "use_clone": true,
    "calculate_impact": true,
    "apply_ratings": true
  }
}
```

**Response:** `202 Accepted`
```json
{
  "test_run_id": "test_xyz789",
  "status": "Running",
  "estimated_time": 30,
  "websocket_channel": "test.xyz789"
}
```

### Get Test Status

```http
GET /tests/{test_run_id}/status
```

**Response:** `200 OK`
```json
{
  "test_run_id": "test_xyz789",
  "status": "Running",
  "progress": 65,
  "current_step": "Extracting entities",
  "steps_completed": 3,
  "total_steps": 5,
  "message": "Processing chunk 13 of 20"
}
```

### Get Test Results

```http
GET /tests/{test_run_id}/results
```

**Response:** `200 OK`
```json
{
  "test_run_id": "test_xyz789",
  "ontology_id": "ont_abc123",
  "dataset_id": "ds_001",
  "status": "Completed",
  "run_date": "2025-09-01T14:30:00Z",
  "duration_seconds": 28,
  "metrics": {
    "precision": 0.89,
    "recall": 0.92,
    "f1_score": 0.905,
    "entities": {
      "expected": 45,
      "extracted": 48,
      "correct": 42
    },
    "edges": {
      "expected": 67,
      "extracted": 65,
      "correct": 61
    }
  },
  "impact": {
    "amplification_factor": 4.2,
    "affected_entities": 156,
    "affected_edges": 289,
    "cascade_depth": 3
  },
  "rating_effectiveness": {
    "facts_above_threshold": 78,
    "facts_below_threshold": 22,
    "effectiveness_score": 0.88
  }
}
```

---

## Import Operations

### Preview Import

```http
POST /imports/preview
Content-Type: multipart/form-data

file: [uploaded file]
ontology_id: ont_abc123
options: {
  "chunk_size": 8000,
  "apply_ratings": true
}
```

**Response:** `200 OK`
```json
{
  "preview": {
    "file_name": "medical_records.txt",
    "file_size": 1048576,
    "chunks": 15,
    "estimated_entities": 120,
    "estimated_edges": 230,
    "sample_extractions": [
      {
        "type": "entity",
        "class": "Patient",
        "value": "John Doe",
        "confidence": 0.95
      },
      {
        "type": "edge",
        "class": "DIAGNOSED_WITH",
        "source": "John Doe",
        "target": "Hypertension",
        "confidence": 0.88
      }
    ],
    "potential_conflicts": [
      {
        "type": "duplicate_entity",
        "existing": "Patient: John Doe (ID: 123)",
        "new": "Patient: John Doe"
      }
    ],
    "impact_assessment": {
      "new_entities": 95,
      "updated_entities": 25,
      "new_edges": 180,
      "amplification_factor": 3.5
    }
  }
}
```

### Execute Import

```http
POST /imports/execute
Content-Type: application/json

{
  "file_id": "file_temp_123",
  "ontology_id": "ont_abc123",
  "graph_id": "graph_456",
  "options": {
    "chunk_size": 8000,
    "apply_ratings": true,
    "min_confidence": 0.7,
    "handle_conflicts": "skip"
  }
}
```

**Response:** `202 Accepted`
```json
{
  "import_id": "imp_789",
  "status": "Processing",
  "websocket_channel": "import.789"
}
```

### Get Import Progress

```http
GET /imports/{import_id}/progress
```

**Response:** `200 OK`
```json
{
  "import_id": "imp_789",
  "status": "Processing",
  "progress": 45,
  "chunks_processed": 7,
  "total_chunks": 15,
  "entities_created": 42,
  "edges_created": 78,
  "errors": [],
  "current_chunk": 8
}
```

---

## Assignment Management

### List Assignments

```http
GET /assignments
```

**Query Parameters:**
- `ontology_id` (string, optional)
- `target_type` (string, optional): graph, user, project
- `active` (boolean, optional)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "asg_001",
      "ontology_id": "ont_abc123",
      "ontology_name": "Healthcare Ontology",
      "target_type": "graph",
      "target_id": "graph_456",
      "override_level": "Required",
      "active": true,
      "created_date": "2025-09-01T10:00:00Z",
      "created_by": "user_123"
    }
  ]
}
```

### Create Assignment

```http
POST /assignments
Content-Type: application/json

{
  "ontology_id": "ont_abc123",
  "target_type": "user",
  "target_id": "user_789",
  "override_level": "Default"
}
```

**Response:** `201 Created`

### Update Assignment

```http
PUT /assignments/{assignment_id}
Content-Type: application/json

{
  "override_level": "Required",
  "active": false
}
```

**Response:** `200 OK`

### Delete Assignment

```http
DELETE /assignments/{assignment_id}
```

**Response:** `204 No Content`

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "E400",
    "message": "Invalid request parameters",
    "details": {
      "field": "ontology_id",
      "reason": "Ontology ID must be a valid UUID"
    },
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "E401",
    "message": "Authentication required",
    "details": "Token expired or invalid",
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "E403",
    "message": "Insufficient permissions",
    "details": {
      "required": "ontology:write",
      "provided": ["ontology:read"]
    },
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "E404",
    "message": "Resource not found",
    "details": {
      "resource": "ontology",
      "id": "ont_xyz999"
    },
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": {
    "code": "E429",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window": "1 hour",
      "retry_after": 1800
    },
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "E500",
    "message": "Internal server error",
    "details": "An unexpected error occurred",
    "timestamp": "2025-09-01T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Rate Limiting

API rate limits are enforced per user based on role:

| Role | Requests per Hour | Burst Limit |
|------|-------------------|-------------|
| Viewer | 100 | 10 |
| User | 1,000 | 50 |
| Admin | 10,000 | 200 |
| Super Admin | Unlimited | Unlimited |

Rate limit information is included in response headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1693584000
```

---

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('wss://api.krypton-graph.com/v1/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
  
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['test.xyz789', 'import.789']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};
```

### Event Types

#### Test Progress
```json
{
  "type": "test.progress",
  "test_run_id": "test_xyz789",
  "progress": 75,
  "message": "Calculating impact metrics",
  "timestamp": "2025-09-01T14:30:15Z"
}
```

#### Test Completed
```json
{
  "type": "test.completed",
  "test_run_id": "test_xyz789",
  "status": "Completed",
  "f1_score": 0.905,
  "timestamp": "2025-09-01T14:30:28Z"
}
```

#### Import Progress
```json
{
  "type": "import.progress",
  "import_id": "imp_789",
  "chunks_processed": 10,
  "total_chunks": 15,
  "entities_created": 67,
  "timestamp": "2025-09-01T15:00:00Z"
}
```

---

## SDK Examples

### Python
```python
from krypton_graph import KryptonClient

client = KryptonClient(
    api_key="your-api-key",
    base_url="https://api.krypton-graph.com/v1"
)

# Create ontology
ontology = client.ontologies.create(
    name="Healthcare Ontology",
    domain="Healthcare",
    description="Medical entities"
)

# Add entity
entity = client.entities.create(
    ontology_id=ontology.id,
    entity_name="Patient",
    entity_class="healthcare.patient",
    properties={"required": ["name"]}
)

# Run test
test_run = client.tests.run(
    ontology_id=ontology.id,
    dataset_id="ds_001",
    use_clone=True
)

# Wait for completion
result = client.tests.wait_for_completion(test_run.id)
print(f"F1 Score: {result.metrics.f1_score}")
```

### JavaScript/TypeScript
```typescript
import { KryptonClient } from '@krypton-graph/sdk';

const client = new KryptonClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.krypton-graph.com/v1'
});

// Create ontology
const ontology = await client.ontologies.create({
  name: 'Healthcare Ontology',
  domain: 'Healthcare',
  description: 'Medical entities'
});

// Add entity
const entity = await client.entities.create(ontology.id, {
  entityName: 'Patient',
  entityClass: 'healthcare.patient',
  properties: { required: ['name'] }
});

// Run test with real-time updates
const testRun = await client.tests.run({
  ontologyId: ontology.id,
  datasetId: 'ds_001',
  useClone: true
});

// Subscribe to progress
client.subscribe(`test.${testRun.id}`, (event) => {
  console.log(`Progress: ${event.progress}%`);
});
```

---

## Postman Collection

Download the [Krypton-Graph Postman Collection](https://api.krypton-graph.com/postman-collection.json) for easy API testing.

---

## Support

For API support:
- Documentation: https://docs.krypton-graph.com
- Status Page: https://status.krypton-graph.com
- Support Email: api-support@krypton-graph.com

---

**API Version:** 1.0  
**Last Updated:** September 2025