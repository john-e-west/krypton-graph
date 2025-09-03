# Technical Specifications
## Krypton-Graph Implementation Details

**Version:** 1.0  
**Date:** September 2025  
**Status:** Active Development

---

## 1. Data Models

### 1.1 Ontology Model
```python
class Ontology:
    id: str                    # AirTable record ID
    name: str                  # Unique ontology name
    domain: str                # Domain (Healthcare, Finance, etc.)
    version: str               # Semantic version (1.0.0)
    status: OntologyStatus     # Draft, Testing, Published, Deprecated
    description: str           # Human-readable description
    created_date: datetime     # Creation timestamp
    modified_date: datetime    # Last modification timestamp
    created_by: str           # Creator user ID
    metadata: Dict[str, Any]  # Additional configuration
```

### 1.2 Entity Definition Model
```python
class EntityDefinition:
    id: str                   # AirTable record ID
    ontology_id: str          # Parent ontology reference
    entity_name: str          # Entity type name (e.g., "Patient")
    entity_class: str         # Zep entity class identifier
    properties: Dict[str, Any] # JSON schema for properties
    validation_rules: List[str] # Validation expressions
    examples: List[str]       # Recognition examples
    priority: int             # Processing priority (1-10)
```

### 1.3 Edge Definition Model
```python
class EdgeDefinition:
    id: str                   # AirTable record ID
    ontology_id: str          # Parent ontology reference
    edge_name: str            # Relationship name (e.g., "TREATS")
    source_entity_id: str     # Source entity definition
    target_entity_id: str     # Target entity definition
    cardinality: str          # one-to-one, one-to-many, many-to-many
    bidirectional: bool       # Is relationship bidirectional
    properties: Dict[str, Any] # Edge properties schema
    examples: List[str]       # Relationship examples
```

### 1.4 Fact Rating Configuration Model
```python
class FactRatingConfig:
    id: str                   # AirTable record ID
    ontology_id: str          # Associated ontology
    name: str                 # Configuration name
    instruction: str          # Natural language instruction
    high_example: str         # Example of high relevance
    medium_example: str       # Example of medium relevance
    low_example: str          # Example of low relevance
    min_rating: float         # Minimum rating threshold (0.0-1.0)
    effectiveness_score: float # Calculated effectiveness
    status: str               # Active, Testing, Inactive
```

---

## 2. API Specifications

### 2.1 REST API Endpoints

#### Ontology Management
```yaml
GET /api/v1/ontologies
  description: List all ontologies
  parameters:
    - domain: string (optional) - Filter by domain
    - status: string (optional) - Filter by status
  response:
    200:
      schema: Array<Ontology>

POST /api/v1/ontologies
  description: Create new ontology
  body:
    name: string (required)
    domain: string (required)
    description: string (optional)
  response:
    201:
      schema: Ontology

GET /api/v1/ontologies/{id}
  description: Get ontology details
  parameters:
    - id: string (required) - Ontology ID
  response:
    200:
      schema: Ontology

PUT /api/v1/ontologies/{id}
  description: Update ontology
  parameters:
    - id: string (required) - Ontology ID
  body:
    name: string (optional)
    description: string (optional)
    status: string (optional)
  response:
    200:
      schema: Ontology

DELETE /api/v1/ontologies/{id}
  description: Delete ontology
  parameters:
    - id: string (required) - Ontology ID
  response:
    204: No Content

POST /api/v1/ontologies/{id}/clone
  description: Clone an ontology
  parameters:
    - id: string (required) - Source ontology ID
  body:
    name: string (required) - New ontology name
    version: string (optional) - New version
  response:
    201:
      schema: Ontology
```

#### Entity Management
```yaml
GET /api/v1/ontologies/{ontology_id}/entities
  description: List entities for an ontology
  response:
    200:
      schema: Array<EntityDefinition>

POST /api/v1/ontologies/{ontology_id}/entities
  description: Create entity definition
  body:
    entity_name: string (required)
    entity_class: string (required)
    properties: object (optional)
    examples: Array<string> (optional)
  response:
    201:
      schema: EntityDefinition

PUT /api/v1/entities/{id}
  description: Update entity definition
  body:
    entity_name: string (optional)
    properties: object (optional)
  response:
    200:
      schema: EntityDefinition

DELETE /api/v1/entities/{id}
  description: Delete entity definition
  response:
    204: No Content
```

#### Testing Operations
```yaml
POST /api/v1/tests/run
  description: Execute ontology test
  body:
    ontology_id: string (required)
    dataset_id: string (required)
    options:
      use_clone: boolean (default: true)
      calculate_impact: boolean (default: true)
  response:
    202:
      schema:
        test_run_id: string
        status: string

GET /api/v1/tests/{id}/status
  description: Get test execution status
  response:
    200:
      schema:
        status: string # Running, Completed, Failed
        progress: number # 0-100
        message: string

GET /api/v1/tests/{id}/results
  description: Get test results
  response:
    200:
      schema:
        metrics:
          precision: number
          recall: number
          f1_score: number
        impact:
          amplification_factor: number
          affected_entities: number
          affected_edges: number
```

### 2.2 WebSocket Events

```typescript
// Client subscription
ws.subscribe('ontology.updates');
ws.subscribe('test.progress');

// Server events
interface OntologyEvent {
  type: 'ontology.created' | 'ontology.updated' | 'ontology.deleted';
  ontology_id: string;
  timestamp: string;
  user: string;
}

interface TestProgressEvent {
  type: 'test.started' | 'test.progress' | 'test.completed' | 'test.failed';
  test_run_id: string;
  progress: number;
  message: string;
  timestamp: string;
}
```

---

## 3. Integration Specifications

### 3.1 Zep Cloud Integration

#### Graph API V3 Operations
```python
# Apply ontology to graph
def apply_ontology_to_graph(graph_id: str, ontology: Ontology):
    zep_client = Zep(api_key=ZEP_API_KEY)
    
    # Convert ontology to Zep format
    entities = convert_to_zep_entities(ontology.entities)
    edges = convert_to_zep_edges(ontology.edges)
    
    # Set graph ontology
    zep_client.graph.set_ontology(
        graph_ids=[graph_id],
        entities=entities,
        edges=edges
    )

# Apply fact rating
def apply_fact_rating(graph_id: str, rating_config: FactRatingConfig):
    zep_client = Zep(api_key=ZEP_API_KEY)
    
    rating_instruction = {
        "instruction": rating_config.instruction,
        "examples": {
            "high": rating_config.high_example,
            "medium": rating_config.medium_example,
            "low": rating_config.low_example
        }
    }
    
    zep_client.graph.set_fact_rating(
        graph_id=graph_id,
        rating_instruction=rating_instruction,
        min_rating=rating_config.min_rating
    )
```

### 3.2 AirTable Integration

#### Connection Configuration
```python
AIRTABLE_CONFIG = {
    "api_key": os.environ["AIRTABLE_API_KEY"],
    "base_id": "appvLsaMZqtLc9EIX",
    "tables": {
        "ontologies": "Ontologies",
        "entities": "EntityDefinitions",
        "edges": "EdgeDefinitions",
        "ratings": "FactRatingConfigs",
        "tests": "TestRuns",
        "assignments": "GraphAssignments"
    }
}
```

#### CRUD Operations Pattern
```python
class AirTableRepository:
    def __init__(self, table_name: str):
        self.table = Airtable(
            AIRTABLE_CONFIG["api_key"]
        ).base(
            AIRTABLE_CONFIG["base_id"]
        ).table(table_name)
    
    def create(self, data: Dict) -> str:
        """Create record and return ID"""
        result = self.table.create(data)
        return result["id"]
    
    def read(self, record_id: str) -> Dict:
        """Read record by ID"""
        return self.table.get(record_id)
    
    def update(self, record_id: str, data: Dict) -> Dict:
        """Update record fields"""
        return self.table.update(record_id, data)
    
    def delete(self, record_id: str) -> bool:
        """Delete record"""
        return self.table.delete(record_id)
    
    def list(self, filter_formula: str = None) -> List[Dict]:
        """List records with optional filter"""
        params = {}
        if filter_formula:
            params["filterByFormula"] = filter_formula
        return self.table.select(**params).all()
```

---

## 4. Performance Specifications

### 4.1 Response Time Requirements
```yaml
operation_slas:
  api_read: 200ms      # GET operations
  api_write: 500ms     # POST/PUT operations
  ui_interaction: 100ms # UI responsiveness
  graph_apply: 5000ms  # Ontology application to graph
  test_execution: 30s  # Per 1000 facts
  import_preview: 2s   # Generate preview
  import_execute: 60s  # Per MB of data
```

### 4.2 Throughput Specifications
```yaml
throughput:
  concurrent_users: 100
  api_requests_per_second: 1000
  graph_operations_per_minute: 60
  import_queue_size: 100
  test_parallel_runs: 10
```

### 4.3 Resource Limits
```yaml
limits:
  max_ontology_size: 10MB
  max_entities_per_ontology: 1000
  max_edges_per_ontology: 5000
  max_file_import_size: 100MB
  max_chunk_size: 10000  # characters (Zep limit)
  max_test_dataset_size: 50MB
  cache_ttl: 3600  # seconds
```

---

## 5. Security Specifications

### 5.1 Authentication
```python
# JWT Token Structure
{
  "sub": "user_id",
  "name": "John Doe",
  "role": "admin",
  "permissions": ["ontology:write", "test:execute"],
  "iat": 1516239022,
  "exp": 1516242622
}

# Token Validation
def validate_token(token: str) -> Dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Invalid token")
```

### 5.2 Authorization Matrix
```yaml
permissions:
  super_admin:
    - "*"  # All permissions
  
  admin:
    - ontology:create
    - ontology:read
    - ontology:update
    - ontology:delete
    - ontology:clone
    - entity:*
    - edge:*
    - rating:*
    - test:*
    - assignment:*
  
  user:
    - ontology:read
    - entity:read
    - edge:read
    - import:preview
    - import:execute
    - test:read
  
  viewer:
    - ontology:read
    - entity:read
    - edge:read
    - test:read
```

### 5.3 Data Encryption
```python
# Encryption configuration
ENCRYPTION_CONFIG = {
    "algorithm": "AES-256-GCM",
    "key_derivation": "PBKDF2",
    "iterations": 100000,
    "salt_length": 32
}

# Field-level encryption for sensitive data
def encrypt_field(data: str) -> str:
    cipher = AES.new(
        ENCRYPTION_KEY,
        AES.MODE_GCM
    )
    ciphertext, tag = cipher.encrypt_and_digest(
        data.encode()
    )
    return base64.b64encode(
        cipher.nonce + tag + ciphertext
    ).decode()
```

---

## 6. Error Handling Specifications

### 6.1 Error Codes
```python
ERROR_CODES = {
    # Client errors (4xx)
    "E400": "Bad Request",
    "E401": "Unauthorized",
    "E403": "Forbidden",
    "E404": "Not Found",
    "E409": "Conflict",
    "E422": "Validation Error",
    "E429": "Rate Limit Exceeded",
    
    # Server errors (5xx)
    "E500": "Internal Server Error",
    "E502": "Bad Gateway (Zep/AirTable unavailable)",
    "E503": "Service Unavailable",
    "E504": "Gateway Timeout"
}
```

### 6.2 Error Response Format
```json
{
  "error": {
    "code": "E422",
    "message": "Validation Error",
    "details": {
      "field": "entity_name",
      "reason": "Entity name must be unique within ontology"
    },
    "timestamp": "2025-09-01T12:34:56Z",
    "request_id": "req_abc123"
  }
}
```

### 6.3 Retry Strategy
```python
RETRY_CONFIG = {
    "max_retries": 3,
    "backoff_factor": 2,  # Exponential backoff
    "retry_statuses": [502, 503, 504],
    "retry_exceptions": [
        ConnectionError,
        TimeoutError
    ]
}

@retry(
    max_attempts=RETRY_CONFIG["max_retries"],
    backoff=RETRY_CONFIG["backoff_factor"]
)
def resilient_api_call(url: str, **kwargs):
    response = requests.get(url, **kwargs)
    if response.status_code in RETRY_CONFIG["retry_statuses"]:
        raise RetryableError(f"Status {response.status_code}")
    return response
```

---

## 7. Monitoring & Logging

### 7.1 Metrics Collection
```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

# Counters
ontology_created_total = Counter(
    'ontology_created_total',
    'Total number of ontologies created',
    ['domain', 'user']
)

test_runs_total = Counter(
    'test_runs_total',
    'Total number of test runs',
    ['status', 'ontology_id']
)

# Histograms
api_request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint', 'status']
)

test_execution_time = Histogram(
    'test_execution_time_seconds',
    'Test execution duration',
    ['ontology_id', 'dataset_size']
)

# Gauges
active_ontologies = Gauge(
    'active_ontologies',
    'Number of active ontologies',
    ['domain']
)

graph_assignments = Gauge(
    'graph_assignments',
    'Number of graph assignments',
    ['override_level']
)
```

### 7.2 Structured Logging
```python
import structlog

logger = structlog.get_logger()

# Log formats
logger.info(
    "ontology_created",
    ontology_id="ont_123",
    name="Healthcare Ontology",
    domain="Healthcare",
    user_id="user_456",
    timestamp=datetime.now().isoformat()
)

logger.error(
    "test_failed",
    test_run_id="test_789",
    ontology_id="ont_123",
    error_code="E500",
    error_message="Graph clone creation failed",
    stack_trace=traceback.format_exc()
)
```

---

## 8. Testing Specifications

### 8.1 Unit Test Requirements
```python
# Test coverage targets
COVERAGE_TARGETS = {
    "overall": 80,
    "critical_paths": 95,
    "api_endpoints": 90,
    "data_models": 85
}

# Example unit test
def test_ontology_creation():
    manager = OntologyManager(
        airtable_base_id="test_base",
        zep_api_key="test_key"
    )
    
    ontology_id = manager.create_ontology(
        name="Test Ontology",
        domain="Testing",
        version="1.0.0"
    )
    
    assert ontology_id is not None
    assert manager.get_ontology(ontology_id).name == "Test Ontology"
```

### 8.2 Integration Test Scenarios
```yaml
integration_tests:
  - name: "End-to-end ontology creation and application"
    steps:
      1. Create ontology via API
      2. Add entity definitions
      3. Add edge definitions
      4. Apply to test graph
      5. Verify graph structure
    expected: Graph contains defined entities and edges
  
  - name: "Clone-based testing workflow"
    steps:
      1. Create ontology
      2. Create test dataset
      3. Execute test with clone
      4. Verify metrics calculation
      5. Cleanup clone
    expected: Metrics match expected values, clone deleted
```

### 8.3 Performance Test Benchmarks
```yaml
performance_benchmarks:
  ontology_operations:
    create: < 500ms
    read: < 200ms
    update: < 500ms
    delete: < 300ms
  
  graph_operations:
    apply_ontology: < 5s
    clone_graph: < 10s
    extract_facts: < 1ms per fact
  
  concurrent_load:
    users: 100
    requests_per_user: 10
    total_time: < 60s
```

---

## Appendices

### A. Environment Variables
```bash
# Required
AIRTABLE_API_KEY=pat.xxxxx
AIRTABLE_BASE_ID=appvLsaMZqtLc9EIX
ZEP_API_KEY=z_xxxxx
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/krypton

# Optional
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
ENVIRONMENT=development
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### B. Database Migrations
```sql
-- Future PostgreSQL migration from AirTable
CREATE TABLE ontologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    metadata JSONB
);

CREATE INDEX idx_ontologies_domain ON ontologies(domain);
CREATE INDEX idx_ontologies_status ON ontologies(status);
```

### C. Deployment Checklist
- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] API keys validated
- [ ] SSL certificates installed
- [ ] Monitoring endpoints accessible
- [ ] Backup procedures verified
- [ ] Rate limiting configured
- [ ] Error tracking enabled

---

**Document Status:** Technical reference for implementation teams