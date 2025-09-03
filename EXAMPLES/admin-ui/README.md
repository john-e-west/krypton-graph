# Krypton-Graph Admin UI

A comprehensive web-based administration interface for the Krypton-Graph Ontology Management System.

## Features

- **📊 Dashboard**: Real-time metrics and system health monitoring
- **🔧 Ontology Management**: Create, edit, clone, and publish ontologies
- **🎯 Fact Rating Configuration**: Design and test relevance filtering rules
- **🧪 Test Runner**: Execute and monitor ontology validation tests
- **👥 User Assignments**: Manage graph and user ontology assignments
- **📈 Analytics**: Track effectiveness metrics and performance trends

## Tech Stack

- **React 18** with TypeScript
- **Material-UI v5** for components
- **React Query** for data fetching
- **Recharts** for data visualization
- **Airtable API** for backend storage
- **React Router v6** for navigation

## Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Airtable account with Krypton-Graph base
- API keys for Airtable and Zep

### Installation

1. Clone the repository:
```bash
cd admin-ui
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
REACT_APP_AIRTABLE_API_KEY=your_airtable_api_key
REACT_APP_AIRTABLE_BASE_ID=appvLsaMZqtLc9EIX
REACT_APP_ZEP_API_KEY=your_zep_api_key
REACT_APP_API_URL=http://localhost:5000
```

4. Start development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
admin-ui/
├── src/
│   ├── components/      # Reusable UI components
│   │   └── Layout.tsx   # Main app layout with navigation
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── OntologyManager.tsx
│   │   ├── FactRatingConfig.tsx
│   │   ├── TestRunner.tsx
│   │   ├── UserAssignments.tsx
│   │   └── ImportMonitor.tsx
│   ├── services/       # API services
│   │   └── airtableService.ts
│   ├── utils/          # Helper functions
│   └── App.tsx         # Main app component
├── public/
└── package.json
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run linter

## Key Features

### Dashboard
- Overview of system metrics
- Active ontologies and configurations
- Recent test results
- System health indicators

### Ontology Management
- Create new ontologies with domain selection
- Define entity and edge types
- Clone existing ontologies
- Version control
- Status workflow (Draft → Testing → Published)

### Fact Rating Configuration
- Create rating instructions with examples
- Set high/medium/low relevance examples
- Configure default minimum ratings
- Test configurations with sample data
- Track effectiveness scores

### Test Runner
- Execute ontology tests against datasets
- Monitor test progress in real-time
- View detailed results and metrics
- Compare precision, recall, and F1 scores

### User Assignments
- Assign ontologies to graphs or users
- Set override levels (Required/Default/Optional)
- Track active assignments
- Bulk assignment operations

## API Integration

The UI integrates with:

1. **Airtable API** for data storage
2. **Zep API** for knowledge graph operations
3. **Python backend** for test execution

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

### Environment Variables

Production environment variables:
- `REACT_APP_AIRTABLE_API_KEY` - Airtable API key
- `REACT_APP_AIRTABLE_BASE_ID` - Airtable base ID
- `REACT_APP_ZEP_API_KEY` - Zep API key
- `REACT_APP_API_URL` - Backend API URL

### Hosting Options

1. **Netlify**: Drop the `build` folder
2. **Vercel**: Connect GitHub repo
3. **AWS S3 + CloudFront**: Static hosting
4. **Docker**: Use provided Dockerfile

## Security Considerations

- API keys should never be committed to version control
- Use environment variables for sensitive data
- Implement proper authentication before production deployment
- Consider using a backend proxy for API calls
- Enable CORS appropriately

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

## Roadmap

- [ ] User authentication and authorization
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Batch operations support
- [ ] Export/import functionality
- [ ] Mobile responsive design improvements
- [ ] Dark mode support
- [ ] Internationalization (i18n)