# Fact Rating Configuration Guide for ADMINs

## Overview

Fact ratings allow you to filter knowledge graph content by relevance, ensuring that only the most important facts are included in the context provided to your AI agents. This guide explains how to configure and manage fact ratings in Krypton-Graph.

## Understanding Fact Ratings

### What Are Fact Ratings?

- **Purpose**: Filter facts by importance to your specific use case
- **Scale**: All facts are rated 0.0 to 1.0
- **Application**: Applied at graph/user level during data ingestion
- **Filtering**: Set minimum rating thresholds to exclude low-relevance facts

### Rating Levels

- **High (0.7-1.0)**: Critical information for decision-making
- **Medium (0.3-0.7)**: Routine but relevant information
- **Low (0.0-0.3)**: Administrative or tangential details

## ADMIN Workflow

### 1. Creating a Fact Rating Configuration

#### Step 1: Access FactRatingConfigs Table
Navigate to your AirTable base and open the `FactRatingConfigs` table.

#### Step 2: Define Rating Instruction
Write clear instructions that explain how facts should be rated for your domain:

```text
Example for Healthcare:
"Rate facts by clinical significance and impact on patient care. 
Highly relevant facts directly affect diagnosis, treatment, or patient safety. 
Medium relevance includes routine care details. 
Low relevance includes administrative or non-clinical information."
```

#### Step 3: Provide Examples
Give concrete examples for each rating level:

- **High Example**: "Patient diagnosed with severe allergic reaction to penicillin"
- **Medium Example**: "Patient completed routine blood pressure check"
- **Low Example**: "Patient's insurance card was updated"

#### Step 4: Set Default Minimum Rating
Choose a default threshold (0.0-1.0) for filtering facts:
- Healthcare: 0.4 (exclude only administrative details)
- Finance: 0.35 (include most transaction data)
- Technology: 0.45 (focus on operational impacts)

### 2. Testing Your Configuration

#### Using Python Script
```python
from src.fact_rating_manager import FactRatingManager

# Initialize manager
manager = FactRatingManager(
    airtable_base_id="appvLsaMZqtLc9EIX",
    zep_api_key="your_zep_api_key"
)

# Test configuration with sample facts
sample_facts = [
    "Patient had severe allergic reaction requiring emergency treatment",
    "Regular monthly check-up completed",
    "Updated phone number in system"
]

result = manager.test_rating_config(
    config_id="your_config_id",
    sample_facts=sample_facts
)

print(f"Accuracy: {result.accuracy_score}")
print(f"Ratings: {result.actual_ratings}")
```

#### Review Test Results
Check the `FactRatingTests` table for:
- Accuracy scores (aim for >0.75)
- Rating distribution (should match your expectations)
- Processing success rate

### 3. Activating a Configuration

Once testing is satisfactory:

1. Update Status to "Active" in FactRatingConfigs
2. Configuration automatically applies to assigned graphs/users
3. Monitor effectiveness score over time

### 4. Assigning to Graphs/Users

#### Option A: During Ontology Assignment
When assigning an ontology to a graph/user, the active rating configuration is automatically included.

#### Option B: Direct Application
```python
# Apply to specific graph
manager.apply_rating_to_graph(config_id, graph_id)

# Apply to specific user
manager.apply_rating_to_user(config_id, user_id)
```

## Best Practices

### 1. Domain-Specific Instructions
- Use terminology familiar to your domain experts
- Reference specific compliance requirements or standards
- Include context about critical vs. routine information

### 2. Example Selection
- Choose examples that clearly differentiate rating levels
- Use real-world scenarios from your domain
- Avoid ambiguous cases in examples

### 3. Threshold Tuning
- Start with moderate thresholds (0.3-0.5)
- Adjust based on user feedback
- Consider different thresholds for different use cases

### 4. Iterative Improvement
- Regularly review effectiveness scores
- Update examples based on edge cases
- Refine instructions based on test results

## Monitoring and Optimization

### Key Metrics to Track

1. **Effectiveness Score**: Overall configuration performance (target: >0.75)
2. **Rating Distribution**: Balance across high/medium/low
3. **User Feedback**: Track false positives/negatives
4. **Context Quality**: Monitor agent performance with filtered facts

### When to Update Configurations

- Effectiveness score drops below 0.7
- Significant false positive/negative reports
- Domain requirements change
- New types of facts emerge

## Common Configurations by Domain

### Healthcare
```yaml
Instruction: "Rate by clinical significance and patient safety impact"
High: "Life-threatening conditions, critical diagnoses, emergency treatments"
Medium: "Routine treatments, standard medications, regular check-ups"
Low: "Administrative updates, scheduling changes, insurance details"
Default Min Rating: 0.4
```

### Finance
```yaml
Instruction: "Rate by financial risk and regulatory importance"
High: "Fraud indicators, compliance violations, large transactions"
Medium: "Regular transactions, account activities, payment history"
Low: "Marketing preferences, UI settings, session logs"
Default Min Rating: 0.35
```

### Technology
```yaml
Instruction: "Rate by system criticality and operational impact"
High: "Production outages, security breaches, data loss"
Medium: "Performance degradation, configuration changes, deployments"
Low: "Documentation updates, cosmetic changes, test results"
Default Min Rating: 0.45
```

## Troubleshooting

### Issue: All facts rated similarly
**Solution**: Make examples more distinct; increase contrast in instruction

### Issue: Important facts filtered out
**Solution**: Lower minimum rating threshold; review high example

### Issue: Too much noise in context
**Solution**: Raise minimum rating threshold; refine low example

### Issue: Inconsistent ratings
**Solution**: Clarify instruction; add domain context; provide more examples

## Advanced Features

### Dynamic Threshold Adjustment
```python
# Adjust threshold based on graph size
if graph_entity_count > 1000:
    min_rating = 0.5  # More selective for large graphs
else:
    min_rating = 0.3  # More inclusive for small graphs
```

### Multi-Level Filtering
```python
# Different thresholds for different operations
search_threshold = 0.6  # High threshold for search
context_threshold = 0.4  # Medium threshold for context
export_threshold = 0.2  # Low threshold for data export
```

### A/B Testing Configurations
Test multiple configurations simultaneously:
1. Create variant configurations
2. Assign to different user groups
3. Compare effectiveness scores
4. Deploy winning configuration

## API Reference

### FactRatingManager Methods

- `create_rating_config()`: Create new configuration
- `test_rating_config()`: Test with sample facts
- `apply_rating_to_graph()`: Apply to specific graph
- `apply_rating_to_user()`: Apply to specific user
- `activate_config()`: Activate after testing
- `calculate_effectiveness_score()`: Measure performance

## Support

For assistance with fact rating configurations:
1. Review test results in FactRatingTests table
2. Check effectiveness scores in FactRatingConfigs
3. Consult domain experts for instruction refinement
4. Contact support with configuration ID and test results