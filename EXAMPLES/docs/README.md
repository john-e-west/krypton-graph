# Krypton-Graph

An ontology management system for AI knowledge graphs that bridges domain expertise with Zep's temporal knowledge graph infrastructure.

## Features

- **Ontology Management**: Define, test, and deploy custom ontologies
- **Domain Expert Interface**: Non-technical UI for knowledge graph configuration
- **Clone-Based Testing**: Safe testing environment with impact assessment
- **Fact Rating System**: Relevance filtering for extracted knowledge
- **Real-time Updates**: Live synchronization via Convex backend

## Tech Stack

- **Backend**: Convex (serverless backend)
- **Frontend**: React 18 + TypeScript + Material-UI
- **Data Storage**: Convex Database + AirTable + Zep Cloud
- **Testing**: Clone-based testing with impact metrics

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account
- Clerk account (for authentication)
- AirTable account
- Zep API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/krypton-graph.git
cd krypton-graph
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Setup Convex:
```bash
npx convex dev
```

When prompted:
- Login to your Convex account
- Create a new project named `krypton-graph-v2`
- The schema and functions will be automatically deployed

5. Start the development server:
```bash
npm run dev
```

## Convex Setup Instructions

### First-Time Setup

1. **Login to Convex**:
```bash
npx convex login
```
   - Follow browser authentication flow
   - Grant CLI access to your account

2. **Initialize Project**:
```bash
npx convex dev
```
   - When prompted, select "Create a new project"
   - Name it: `krypton-graph-v2`
   - Select your team or personal account

3. **Deploy Schema**:
   - The schema in `convex/schema.ts` will auto-deploy
   - Verify deployment in the Convex dashboard

### Authentication Setup (Clerk)

1. **Create Clerk Application**:
   - Sign up at [clerk.com](https://clerk.com)
   - Create new application
   - Note your domain and API keys

2. **Configure Clerk Webhook**:
   - In Clerk Dashboard, go to Webhooks
   - Add endpoint: `https://your-deployment.convex.site/clerk-webhook`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy webhook secret

3. **Update Environment Variables**:
```env
CLERK_ISSUER_URL=https://your-domain.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

### Environment Configuration

Add to your `.env` file:
```env
CONVEX_DEPLOYMENT=krypton-graph-v2
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Available Convex Functions

#### Authentication & Users
- `users:current` - Get current authenticated user
- `users:list` - List all users (admin only)
- `users:updateRole` - Update user role (admin only)
- `users:getByEmail` - Find user by email (admin only)

#### Ontologies (Authenticated)
- `ontologies:create` - Create new ontology (editor/admin)
- `ontologies:update` - Update existing ontology (editor/admin)
- `ontologies:remove` - Delete ontology (admin only)
- `ontologies:list` - List ontologies with pagination
- `ontologies:get` - Get single ontology by ID
- `ontologies:getByDomain` - Get ontologies by domain

#### Entities
- `entities:create` - Create new entity type
- `entities:update` - Update entity type
- `entities:remove` - Delete entity type
- `entities:listByOntology` - List entities for an ontology
- `entities:listByType` - List entities by type
- `entities:get` - Get single entity by ID

#### Edges
- `edges:create` - Create new edge type
- `edges:update` - Update edge type
- `edges:remove` - Delete edge type
- `edges:listByOntology` - List edges for an ontology
- `edges:get` - Get single edge by ID

#### Test Runs
- `testRuns:create` - Create new test run
- `testRuns:updateStatus` - Update test run status
- `testRuns:listByOntology` - List test runs for an ontology
- `testRuns:listByStatus` - List test runs by status
- `testRuns:get` - Get single test run by ID

### Testing Convex Functions

Test functions using the Convex CLI:

```bash
# Create an ontology
npx convex run ontologies:create \
  --name "Medical Records" \
  --domain "Healthcare" \
  --description "Medical record ontology"

# List all ontologies
npx convex run ontologies:list

# List draft ontologies
npx convex run ontologies:list --status "draft"
```

### Real-time Subscriptions

The Convex backend provides real-time updates. Use React hooks in the frontend:

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function OntologyList() {
  const ontologies = useQuery(api.ontologies.list);
  // Component auto-updates when data changes
}
```

## Project Structure

```
krypton-graph/
├── convex/              # Convex backend
│   ├── schema.ts       # Database schema
│   ├── ontologies.ts   # Ontology operations
│   ├── entities.ts     # Entity operations
│   ├── edges.ts        # Edge operations
│   └── testRuns.ts     # Test run operations
├── admin-ui/           # React admin interface
├── src/                # Python services (legacy)
└── docs/               # Documentation
```

## Development Workflow

1. **Schema Changes**: Edit `convex/schema.ts` and run `npx convex dev`
2. **Add Functions**: Create new `.ts` files in `convex/` directory
3. **Type Safety**: TypeScript types auto-generated in `convex/_generated/`
4. **Testing**: Use Convex dashboard or CLI for function testing
5. **Deployment**: Push to production with `npx convex deploy`

## Troubleshooting

### Convex Connection Issues
- Ensure `npx convex dev` is running
- Check `.env` for correct deployment URL
- Verify network connectivity

### Schema Deployment Errors
- Check TypeScript syntax in schema file
- Ensure all validators use Convex's `v` object
- Review index definitions for correctness

### Real-time Updates Not Working
- Verify WebSocket connection in browser console
- Check Convex dashboard for active connections
- Ensure query subscriptions are properly configured

## Contributing

1. Create feature branch from `main`
2. Follow TypeScript strict mode
3. Add tests for new functions
4. Update documentation
5. Submit PR with clear description

## License

[Your License Here]

## Support

For issues or questions:
- Check documentation in `/docs`
- Review test examples
- Contact development team