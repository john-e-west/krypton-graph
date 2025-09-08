# API Documentation - Document Upload Service

## Base URL
```
https://api.kryptongraph.com/v1
```

## Authentication
All API endpoints require authentication via Bearer token:
```bash
Authorization: Bearer <your-api-key>
```

## Endpoints

### Upload Documents

**POST** `/documents/upload`

Upload one or more documents to the system for processing.

#### Request Format
- **Content-Type**: `multipart/form-data`
- **Max File Size**: 50MB per file
- **Max Files**: 10 files per request
- **Supported Formats**: PDF, TXT, MD, DOCX

#### Request Example
```bash
curl -X POST \
  https://api.kryptongraph.com/v1/documents/upload \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@document.pdf' \
  -F 'metadata={"source": "research", "priority": "high"}'
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "documentId": "doc_12345",
    "filename": "document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf",
    "status": "uploaded",
    "uploadedAt": "2025-09-08T12:00:00Z",
    "processingEstimate": "2-3 minutes"
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "File exceeds maximum size limit of 50MB",
    "details": {
      "filename": "large-document.pdf",
      "actualSize": 52428800,
      "maxSize": 52428800
    }
  }
}
```

**413 Payload Too Large**
```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Request exceeds maximum payload size",
    "maxSize": "50MB"
  }
}
```

**415 Unsupported Media Type**
```json
{
  "error": {
    "code": "UNSUPPORTED_FORMAT",
    "message": "File type not supported",
    "supportedTypes": ["pdf", "txt", "md", "docx"]
  }
}
```

### Get Upload Status

**GET** `/documents/{documentId}/status`

Check the processing status of an uploaded document.

#### Response Example
```json
{
  "success": true,
  "data": {
    "documentId": "doc_12345",
    "status": "processing",
    "progress": 75,
    "stage": "entity_extraction",
    "estimatedCompletion": "2025-09-08T12:05:00Z",
    "processingStages": {
      "upload": "completed",
      "extraction": "completed", 
      "chunking": "completed",
      "entity_extraction": "in_progress",
      "graph_integration": "pending"
    }
  }
}
```

### List Documents

**GET** `/documents`

Retrieve a list of uploaded documents with optional filtering.

#### Query Parameters
- `status`: Filter by processing status (`uploaded`, `processing`, `completed`, `failed`)
- `format`: Filter by file format (`pdf`, `txt`, `md`, `docx`)
- `limit`: Number of results to return (default: 20, max: 100)
- `offset`: Number of results to skip for pagination

#### Response Example
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "documentId": "doc_12345",
        "filename": "research-paper.pdf",
        "status": "completed",
        "uploadedAt": "2025-09-08T12:00:00Z",
        "processedAt": "2025-09-08T12:03:00Z",
        "entities": 45,
        "relationships": 82
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## Rate Limits

- **Upload Endpoint**: 10 requests per minute per API key
- **Status Endpoint**: 100 requests per minute per API key
- **List Endpoint**: 60 requests per minute per API key

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1694176800
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_FILE` | 400 | File validation failed |
| `UNSUPPORTED_FORMAT` | 415 | File format not supported |
| `PAYLOAD_TOO_LARGE` | 413 | File or request too large |
| `RATE_LIMITED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `DOCUMENT_NOT_FOUND` | 404 | Document ID not found |
| `PROCESSING_FAILED` | 500 | Internal processing error |

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
import { KryptonGraphClient } from '@kryptongraph/sdk';

const client = new KryptonGraphClient({
  apiKey: 'your-api-key'
});

const result = await client.documents.upload(file, {
  metadata: { source: 'research' }
});
```

### Python
```python
from kryptongraph import Client

client = Client(api_key='your-api-key')
result = client.documents.upload('document.pdf')
```

## Webhooks

Configure webhooks to receive notifications about document processing events:

```json
{
  "event": "document.processing.completed",
  "documentId": "doc_12345",
  "status": "completed",
  "timestamp": "2025-09-08T12:05:00Z",
  "data": {
    "entities": 45,
    "relationships": 82,
    "processingTime": 180
  }
}
```

## Testing

Use our test environment for development:
- **Base URL**: `https://api-test.kryptongraph.com/v1`
- **Test API Key**: Contact support for test credentials
- **Sample Files**: Available in DocUploadTest folder

---
*This documentation covers the core upload functionality. For advanced features, see the complete API reference.*