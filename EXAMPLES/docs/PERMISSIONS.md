# Krypton-Graph Permission Matrix

## Role Definitions

### Admin
- Full system access
- Can manage users and roles
- Can delete any resource
- Can access audit logs
- Can configure system settings

### Editor
- Can create, read, update ontologies
- Can create, read, update entities and edges
- Can run tests
- Cannot delete resources (except drafts they created)
- Cannot manage users

### Viewer
- Read-only access to all resources
- Can view ontologies, entities, edges
- Can view test results
- Cannot make any modifications
- Cannot access sensitive system data

## Permission Matrix

| Resource | Action | Viewer | Editor | Admin |
|----------|--------|--------|--------|-------|
| **Users** |
| Users | List | ❌ | ❌ | ✅ |
| Users | View | Own only | Own only | ✅ |
| Users | Update Role | ❌ | ❌ | ✅ |
| Users | Delete | ❌ | ❌ | ✅ |
| **Ontologies** |
| Ontologies | List | ✅ | ✅ | ✅ |
| Ontologies | View | ✅ | ✅ | ✅ |
| Ontologies | Create | ❌ | ✅ | ✅ |
| Ontologies | Update | ❌ | ✅ | ✅ |
| Ontologies | Delete | ❌ | ❌ | ✅ |
| Ontologies | Sync to Zep | ❌ | ✅ | ✅ |
| **Entities** |
| Entities | List | ✅ | ✅ | ✅ |
| Entities | View | ✅ | ✅ | ✅ |
| Entities | Create | ❌ | ✅ | ✅ |
| Entities | Update | ❌ | ✅ | ✅ |
| Entities | Delete | ❌ | ❌ | ✅ |
| **Edges** |
| Edges | List | ✅ | ✅ | ✅ |
| Edges | View | ✅ | ✅ | ✅ |
| Edges | Create | ❌ | ✅ | ✅ |
| Edges | Update | ❌ | ✅ | ✅ |
| Edges | Delete | ❌ | ❌ | ✅ |
| **Test Runs** |
| Test Runs | List | ✅ | ✅ | ✅ |
| Test Runs | View | ✅ | ✅ | ✅ |
| Test Runs | Create | ❌ | ✅ | ✅ |
| Test Runs | Update Status | ❌ | ✅ | ✅ |
| Test Runs | Delete | ❌ | ❌ | ✅ |
| **Audit Logs** |
| Audit Logs | View | ❌ | ❌ | ✅ |
| Audit Logs | Export | ❌ | ❌ | ✅ |

## Role Hierarchy

```
Admin (Level 3)
  ├── All Editor permissions
  ├── User management
  ├── Delete operations
  └── System configuration

Editor (Level 2)
  ├── All Viewer permissions
  ├── Create operations
  ├── Update operations
  └── Test execution

Viewer (Level 1)
  └── Read-only access
```

## Implementation Details

### Authentication Flow
1. User authenticates via Clerk
2. Clerk webhook creates/updates user in Convex
3. User record includes role assignment
4. Each request validates authentication token
5. Role-based permissions are enforced

### Permission Checking

```typescript
// Basic authentication required
await requireAuth(ctx);

// Role-based permission required
await requireRole(ctx, "editor");  // Requires editor or admin
await requireRole(ctx, "admin");   // Requires admin only
```

### Audit Logging

All privileged operations are logged:
- User performing action
- Action type
- Resource affected
- Timestamp
- Operation details

### Default Role Assignment

New users are assigned `viewer` role by default. Administrators must explicitly promote users to `editor` or `admin` roles.

## Security Best Practices

1. **Principle of Least Privilege**: Users start with minimal permissions
2. **Audit Trail**: All modifications are logged
3. **Role Validation**: Every operation checks permissions
4. **Session Management**: Active session tracking
5. **Rate Limiting**: Prevents abuse of sensitive operations

## API Endpoints by Role

### Public (No Auth Required)
- None - all endpoints require authentication

### Authenticated (Any Role)
- `users:current` - Get current user info
- `ontologies:list` - List ontologies
- `ontologies:get` - View specific ontology
- `entities:listByOntology` - List entities
- `edges:listByOntology` - List edges
- `testRuns:listByOntology` - List test runs

### Editor Required
- `ontologies:create` - Create new ontology
- `ontologies:update` - Update ontology
- `entities:create` - Create entity
- `entities:update` - Update entity
- `edges:create` - Create edge
- `edges:update` - Update edge
- `testRuns:create` - Start test run
- `testRuns:updateStatus` - Update test status

### Admin Required
- `users:list` - List all users
- `users:updateRole` - Change user roles
- `ontologies:remove` - Delete ontology
- `entities:remove` - Delete entity
- `edges:remove` - Delete edge

## Troubleshooting

### Common Permission Issues

1. **"Unauthorized: No authentication"**
   - User is not logged in
   - Authentication token expired
   - Clerk configuration incorrect

2. **"Unauthorized: User not found"**
   - User authenticated but not in database
   - Clerk webhook may have failed
   - Manual user sync required

3. **"Unauthorized: Requires {role} role"**
   - User lacks required permissions
   - Contact admin for role upgrade

4. **Rate Limit Exceeded**
   - Too many requests in short period
   - Implement request batching
   - Contact admin if limits too restrictive