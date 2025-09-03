# CLAUDE.md - AI Assistant Guidelines

This file provides guidance to Claude Code and other AI assistants when working with the Krypton-Graph codebase.

## Project Overview

**Krypton-Graph** is an ontology management system for AI knowledge graphs that bridges domain expertise with Zep's temporal knowledge graph infrastructure. It enables non-technical domain experts to define, test, and deploy custom ontologies for extracting domain-specific knowledge from unstructured data.

## Key Components

### 1. Core Python Modules (`/src`)
- `ontology_manager.py` - Manages ontology CRUD operations and AirTable integration
- `fact_rating_manager.py` - Handles fact rating configurations for relevance filtering  
- `ontology_tester.py` - Clone-based testing with impact assessment
- `user_import_manager.py` - File import with preview and conflict detection

### 2. Admin UI (`/admin-ui`)
- React 18 + TypeScript application
- Material-UI components
- Real-time dashboard with metrics
- Visual ontology and rating configuration

### 3. Data Storage
- **AirTable**: Stores ontology metadata, configurations, test results
- **Zep Cloud**: Manages actual knowledge graphs and extraction
- **Environment Variables**: API keys and configuration

## Development Guidelines

### When Adding Features
1. **Check existing patterns** - Follow established code patterns in the codebase
2. **Update tests** - Add unit tests for new functionality
3. **Document changes** - Update relevant documentation
4. **Consider impact** - Use clone-based testing for risky operations

### Code Style
- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use strict mode, define interfaces
- **React**: Functional components with hooks
- **Naming**: Descriptive names, avoid abbreviations

### Common Tasks

#### Creating a New Ontology
```python
from src.ontology_manager import OntologyManager

manager = OntologyManager(airtable_base_id, zep_api_key)
ontology_id = manager.create_ontology(
    name="Medical Records",
    domain="Healthcare",
    version="1.0"
)
```

#### Testing an Ontology
```python
from src.ontology_tester import OntologyTester

tester = OntologyTester(airtable_base_id, zep_api_key)
metrics, impact = await tester.test_ontology(ontology_id, dataset_id)
```

#### Configuring Fact Ratings
```python
from src.fact_rating_manager import FactRatingManager

rating_manager = FactRatingManager(airtable_base_id, zep_api_key)
config_id = rating_manager.create_rating_config(
    ontology_id=ontology_id,
    config_name="Clinical Relevance",
    instruction="Rate by medical significance",
    examples={
        "high": "Severe allergic reaction",
        "medium": "Routine checkup",
        "low": "Administrative update"
    }
)
```

## Important Concepts

### Ontologies
- Define entity types (e.g., Patient, Doctor)
- Define edge types (e.g., TREATS, DIAGNOSED_WITH)
- Include validation rules and examples
- Version controlled with status workflow

### Fact Ratings
- Filter facts by relevance (0.0 to 1.0 scale)
- Use instruction + examples to guide rating
- Set minimum thresholds to exclude noise
- Track effectiveness over time

### Clone-Based Testing
- Create isolated graph clones for testing
- Simulate changes without affecting production
- Calculate impact metrics and cascade effects
- Support rollback if needed

### Impact Assessment
- Preview changes before applying
- Detect conflicts and duplicates
- Show cascade effects (amplification factor)
- Provide confidence scores

## Environment Setup

Required environment variables:
```bash
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appvLsaMZqtLc9EIX
ZEP_API_KEY=your_zep_key
REACT_APP_API_URL=http://localhost:5000
```

## Common Issues & Solutions

### Issue: Zep processing delay
**Solution**: Add 2-5 second delays after graph operations

### Issue: AirTable rate limits
**Solution**: Implement caching and batch operations

### Issue: Large file imports
**Solution**: Chunk files to respect Zep's 10K character limit

### Issue: Test failures
**Solution**: Check test dataset format and expected results

## Testing Strategy

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test service interactions
3. **Clone Tests**: Test on isolated graph copies
4. **Impact Tests**: Assess cascade effects
5. **User Acceptance**: Preview before commit

## Security Considerations

- Never commit API keys
- Use environment variables for secrets
- Validate all user inputs
- Implement rate limiting
- Use clone graphs for testing
- Audit all operations

## Performance Optimization

- Cache frequently accessed data
- Batch AirTable operations
- Paginate large result sets
- Use async/await for I/O operations
- Implement progress indicators

## Contributing

1. Create feature branch from `main`
2. Follow existing code patterns
3. Add tests for new features
4. Update documentation
5. Submit PR with clear description

## Resources

- [Zep Documentation](https://help.getzep.com/)
- [AirTable API](https://airtable.com/developers/web/api/introduction)
- [Project PRD](./prd.md)
- [Architecture Guide](./architecture.md)

## Contact

For questions about the codebase:
- Check existing documentation
- Review test files for examples
- Consult architecture diagrams
- Reference the PRD for requirements

---

**Note to AI Assistants**: This project emphasizes safety through clone-based testing and impact assessment. Always consider the cascade effects of changes to knowledge graphs. When in doubt, test on a clone first.