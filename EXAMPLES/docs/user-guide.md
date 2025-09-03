# User Guide
## Krypton-Graph Ontology Management System

**Version:** 1.0  
**Date:** September 2025  
**Audience:** Domain Experts, Data Analysts, System Administrators

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Admin User Guide](#3-admin-user-guide)
4. [Standard User Guide](#4-standard-user-guide)
5. [Best Practices](#5-best-practices)
6. [Troubleshooting](#6-troubleshooting)
7. [FAQ](#7-faq)

---

## 1. Introduction

### 1.1 What is Krypton-Graph?

Krypton-Graph is an ontology management system that enables you to define how AI extracts and organizes knowledge from your documents. Think of it as teaching AI to understand your specific domain - whether that's healthcare, finance, technology, or any specialized field.

### 1.2 Key Concepts

**Ontology**: A blueprint that defines what types of information (entities) and relationships (edges) the AI should look for in your data.

**Entity**: A thing or concept in your domain (e.g., Patient, Doctor, Medication in healthcare).

**Edge**: A relationship between entities (e.g., Doctor TREATS Patient).

**Fact Rating**: A relevance filter that helps focus on the most important information.

**Impact Assessment**: A preview showing how changes will affect your knowledge graph.

### 1.3 User Roles

- **Admin**: Creates and manages ontologies, configures ratings, runs tests
- **User**: Imports documents, views results, uses existing ontologies
- **Viewer**: Read-only access to view ontologies and results

---

## 2. Getting Started

### 2.1 Accessing Krypton-Graph

1. Open your web browser (Chrome, Firefox, Safari, or Edge)
2. Navigate to: `https://krypton-graph.example.com`
3. Log in with your credentials

### 2.2 First Time Login

When you first log in:
1. You'll see the Dashboard showing system overview
2. Review the getting started tutorial (if available)
3. Explore the main navigation menu on the left

### 2.3 Navigation Overview

The main menu includes:
- **Dashboard**: System overview and metrics
- **Ontology Manager**: Create and manage ontologies
- **Fact Rating Config**: Configure relevance filters
- **Test Runner**: Validate ontologies with test data
- **User Assignments**: Manage who uses which ontologies
- **Import Monitor**: Track document imports

---

## 3. Admin User Guide

### 3.1 Creating Your First Ontology

#### Step 1: Navigate to Ontology Manager
Click "Ontology Manager" in the left menu.

#### Step 2: Create New Ontology
1. Click the "Create New Ontology" button
2. Fill in the form:
   - **Name**: Give your ontology a descriptive name (e.g., "Healthcare Knowledge Base")
   - **Domain**: Select or enter your domain (e.g., Healthcare, Finance, Legal)
   - **Description**: Explain what this ontology captures
   - **Version**: Start with "1.0.0"

#### Step 3: Define Entities
Entities are the "things" in your domain.

Example for Healthcare:
```
Entity Name: Patient
Properties:
  - name (required)
  - medical_record_number (required)
  - date_of_birth (optional)
  - conditions (optional, list)

Recognition Examples:
  - "John Doe, MRN: 12345"
  - "Patient Jane Smith"
  - "45-year-old male patient"
```

To add an entity:
1. Click "Add Entity"
2. Enter the entity name
3. Define properties (what information to capture)
4. Add recognition examples (how it appears in text)
5. Set priority (1 = highest, 10 = lowest)

#### Step 4: Define Edges
Edges are relationships between entities.

Example:
```
Edge Name: TREATS
Source: Doctor
Target: Patient
Type: One-to-Many (one doctor treats many patients)
Examples:
  - "Dr. Smith is treating John Doe"
  - "Patient under the care of Dr. Johnson"
```

To add an edge:
1. Click "Add Edge"
2. Enter the relationship name
3. Select source and target entities
4. Choose cardinality (one-to-one, one-to-many, many-to-many)
5. Add examples of how this relationship appears in text

#### Step 5: Save and Publish
1. Click "Save" to save as draft
2. Test your ontology (see Testing section)
3. Once satisfied, click "Publish" to make it available

### 3.2 Configuring Fact Ratings

Fact ratings help filter out noise and focus on relevant information.

#### Creating a Rating Configuration

1. Navigate to "Fact Rating Config"
2. Click "Create New Configuration"
3. Select the ontology to configure
4. Fill in the configuration:

**Instruction**: Write a clear instruction for rating facts.
```
Example: "Rate the medical significance of each fact from 0.0 to 1.0, 
where 1.0 is critically important medical information and 0.0 is 
administrative or irrelevant information."
```

**High Relevance Example** (0.7-1.0):
```
"Patient diagnosed with Stage 3 lung cancer"
"Severe allergic reaction to penicillin"
"Emergency surgery required"
```

**Medium Relevance Example** (0.3-0.7):
```
"Routine checkup scheduled"
"Blood pressure slightly elevated"
"Prescription refill needed"
```

**Low Relevance Example** (0.0-0.3):
```
"Insurance card updated"
"Prefers morning appointments"
"Parking validated"
```

**Minimum Rating Threshold**: Set to filter out low-relevance facts (e.g., 0.3)

#### Testing Your Configuration

1. Click "Test Configuration"
2. Enter sample facts from your domain
3. Review the ratings assigned
4. Adjust examples if ratings don't match expectations
5. Save when satisfied

### 3.3 Testing Ontologies

Testing ensures your ontology correctly extracts information.

#### Preparing Test Data

1. Navigate to "Test Runner"
2. Click "Create Test Dataset"
3. Upload or paste sample documents
4. Define expected results:
   - What entities should be found
   - What relationships should be extracted

#### Running a Test

1. Select your ontology
2. Select your test dataset
3. Configure test options:
   - **Use Clone**: Yes (recommended for safety)
   - **Calculate Impact**: Yes (to see cascade effects)
   - **Apply Ratings**: Yes (if configured)
4. Click "Run Test"

#### Interpreting Results

The test results show:
- **Precision**: How accurate the extractions are (aim for >80%)
- **Recall**: How complete the extractions are (aim for >75%)
- **F1 Score**: Overall performance (aim for >80%)

Example interpretation:
```
Precision: 0.85 → 85% of extracted facts were correct
Recall: 0.78 → 78% of expected facts were found
F1 Score: 0.81 → Good overall performance

Impact Assessment:
- Amplification Factor: 3.5x → Each change affects 3.5 other elements
- Affected Entities: 45 → Number of entities impacted
- Cascade Depth: 2 → Changes propagate through 2 levels
```

### 3.4 Managing Assignments

Assignments determine which ontologies are used for which graphs or users.

#### Assigning to a Graph

1. Navigate to "User Assignments"
2. Click "Create Assignment"
3. Select:
   - **Ontology**: The ontology to assign
   - **Target Type**: "Graph"
   - **Target ID**: The graph identifier
   - **Override Level**:
     - Required: Must use this ontology
     - Default: Use unless overridden
     - Optional: Available but not automatic

#### Assigning to Users

1. Follow the same process but select:
   - **Target Type**: "User"
   - **Target ID**: User identifier

#### Bulk Assignments

For multiple assignments:
1. Click "Bulk Assign"
2. Upload CSV with: ontology_id, target_type, target_id, override_level
3. Review preview
4. Confirm assignment

### 3.5 Cloning and Versioning

#### Creating a New Version

1. Find the ontology to version
2. Click "Clone"
3. Enter new name and version (e.g., "2.0.0")
4. Make your changes
5. Test thoroughly
6. Publish when ready

#### Best Practices for Versioning

- Use semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes

Example:
- 1.0.0 → Initial version
- 1.1.0 → Added new entity types
- 1.1.1 → Fixed recognition patterns
- 2.0.0 → Restructured entities (breaking change)

---

## 4. Standard User Guide

### 4.1 Importing Documents

#### Preparing Your Files

Supported formats:
- Text files (.txt)
- JSON files (.json)
- Markdown files (.md)
- CSV files (.csv)

File size limits:
- Maximum file size: 100MB
- Files larger than 10MB will be automatically chunked

#### Import Process

1. Navigate to "Import Monitor"
2. Click "New Import"
3. Select or drag your file(s)
4. Choose ontology (if not pre-assigned)
5. Click "Preview Import"

#### Understanding the Preview

The preview shows:
```
Estimated Extractions:
- Entities: 120 (95 new, 25 updates)
- Relationships: 230 new
- Conflicts: 3 potential duplicates

Sample Extractions:
✓ Patient: John Doe (95% confidence)
✓ Diagnosis: Hypertension (88% confidence)
✓ Relationship: John Doe DIAGNOSED_WITH Hypertension

Impact Assessment:
- This import will affect 156 existing entities
- Amplification factor: 3.5x
- Estimated processing time: 2 minutes
```

#### Confirming Import

If the preview looks good:
1. Review conflict resolution options:
   - **Skip**: Don't import conflicting items
   - **Update**: Overwrite existing items
   - **Merge**: Combine information
2. Click "Execute Import"
3. Monitor progress in real-time

### 4.2 Viewing Results

#### Dashboard Metrics

The dashboard shows:
- Active ontologies in use
- Recent imports
- Extraction success rates
- System health

#### Exploring Extracted Knowledge

After import:
1. Navigate to "Knowledge Browser" (if available)
2. Search for entities or relationships
3. View the knowledge graph visualization
4. Export results as needed

### 4.3 Troubleshooting Imports

#### Common Issues and Solutions

**Issue: Low extraction rate**
- Check if the correct ontology is selected
- Verify the document format matches expected patterns
- Contact admin to adjust ontology recognition patterns

**Issue: Many conflicts detected**
- Review if you're reimporting the same data
- Check conflict resolution settings
- Consider using "Update" mode for refreshing data

**Issue: Import taking too long**
- Large files are processed in chunks
- Check the progress indicator
- Processing speed: ~1MB per minute typical

---

## 5. Best Practices

### 5.1 Ontology Design Best Practices

#### Start Simple
- Begin with 3-5 core entities
- Add complexity gradually
- Test at each stage

#### Use Clear Naming
- Entity names should be nouns (Patient, Document, Transaction)
- Edge names should be verbs (TREATS, OWNS, SUBMITTED)
- Be consistent with naming conventions

#### Provide Good Examples
- Include 3-5 recognition examples per entity
- Cover different ways the entity appears in text
- Include edge cases and variations

### 5.2 Testing Best Practices

#### Create Comprehensive Test Data
- Include positive examples (what should be found)
- Include negative examples (what should not be found)
- Cover edge cases and exceptions

#### Iterate Based on Results
- If precision is low: Tighten recognition patterns
- If recall is low: Add more examples
- If both are low: Reconsider ontology structure

### 5.3 Rating Configuration Best Practices

#### Clear Instructions
Write instructions as if explaining to a human:
- Be specific about what's important
- Give context about your domain
- Explain the rating scale clearly

#### Balanced Examples
- Provide 2-3 examples for each level (high/medium/low)
- Examples should be clearly different
- Cover typical cases, not just extremes

### 5.4 Import Best Practices

#### Data Preparation
- Clean your data before import
- Remove duplicate information
- Ensure consistent formatting

#### Batch Processing
- Import related documents together
- Process in logical groups (by date, type, source)
- Monitor the first batch closely before bulk processing

---

## 6. Troubleshooting

### 6.1 Login Issues

**Cannot log in:**
1. Check your username and password
2. Clear browser cache and cookies
3. Try a different browser
4. Contact your administrator

**Session expires frequently:**
- This is a security feature
- Save work frequently
- Consider using "Remember me" if available

### 6.2 Ontology Issues

**Cannot create ontology:**
- Check you have Admin role
- Verify all required fields are filled
- Ensure ontology name is unique

**Entities not being recognized:**
- Add more recognition examples
- Check for typos in patterns
- Test with simpler patterns first

### 6.3 Performance Issues

**Slow page loading:**
- Check your internet connection
- Clear browser cache
- Try during off-peak hours

**Import processing slow:**
- Large files take time (1MB/minute typical)
- Check if other large imports are running
- Consider splitting very large files

### 6.4 Error Messages

**"Ontology not found"**
- The ontology may have been deleted
- Check if you have permission to access it
- Try refreshing the page

**"Rate limit exceeded"**
- You've made too many requests
- Wait a few minutes and try again
- Contact admin if this persists

**"Invalid data format"**
- Check your file format is supported
- Ensure JSON is properly formatted
- Remove special characters if present

---

## 7. FAQ

### General Questions

**Q: How long does it take to process a document?**
A: Typically 1-2 seconds per page of text. Large documents may take several minutes.

**Q: Can I undo an import?**
A: No, imports cannot be undone. Always use the preview feature first. Admins may be able to restore from backups if necessary.

**Q: How many ontologies can I create?**
A: There's no hard limit, but we recommend keeping it organized with one ontology per domain.

### Ontology Questions

**Q: Can I use multiple ontologies on the same data?**
A: Yes, you can assign multiple ontologies to process the same documents from different perspectives.

**Q: How do I know if my ontology is working well?**
A: Run tests regularly. Aim for F1 scores above 0.8 (80%). Monitor the extraction rates on real data.

**Q: Can I share ontologies with other organizations?**
A: Yes, ontologies can be exported and imported. Contact your admin for cross-organization sharing.

### Technical Questions

**Q: What file formats are supported?**
A: Text (.txt), JSON (.json), Markdown (.md), and CSV (.csv). PDF support is coming soon.

**Q: Is there an API available?**
A: Yes, developers can access the REST API. See the API Documentation for details.

**Q: How is my data secured?**
A: All data is encrypted in transit (TLS) and at rest (AES-256). Access is controlled by role-based permissions.

### Best Practices Questions

**Q: How often should I update my ontology?**
A: Review monthly, update quarterly, or whenever your domain knowledge evolves significantly.

**Q: Should I create one large ontology or several small ones?**
A: Several focused ontologies are usually better than one large one. They're easier to maintain and test.

**Q: How many examples should I provide?**
A: At least 3-5 per entity/edge, more for complex or variable patterns. Quality matters more than quantity.

---

## Glossary

**Amplification Factor**: How much a single change affects the knowledge graph (e.g., 3x means one change affects 3 other elements)

**Cardinality**: The type of relationship between entities (one-to-one, one-to-many, many-to-many)

**Cascade Effect**: How changes propagate through connected entities and relationships

**Clone**: A copy of an ontology or graph used for safe testing

**Edge**: A relationship or connection between two entities

**Entity**: A thing or concept that can be identified and extracted from text

**F1 Score**: A measure of extraction accuracy combining precision and recall

**Fact Rating**: A relevance score from 0.0 to 1.0 indicating importance

**Graph**: A network of connected entities and relationships

**Impact Assessment**: Analysis showing how changes will affect existing data

**Ontology**: A formal definition of entity types and relationships for a domain

**Override Level**: Priority setting for ontology assignment (Required/Default/Optional)

**Precision**: Percentage of extracted information that is correct

**Recall**: Percentage of expected information that was successfully extracted

---

## Getting Help

### Support Channels

- **Documentation**: https://docs.krypton-graph.com
- **Video Tutorials**: https://krypton-graph.com/tutorials
- **Community Forum**: https://community.krypton-graph.com
- **Email Support**: support@krypton-graph.com

### Emergency Contacts

For critical issues:
- **System Admin**: admin@krypton-graph.com
- **24/7 Hotline**: +1-555-KRYPTON

### Training Resources

- Monthly webinars for new users
- Advanced admin training quarterly
- Custom training available on request

---

**Document Version:** 1.0  
**Last Updated:** September 2025  
**Next Review:** December 2025

---

## Quick Reference Card

### Common Tasks

| Task | Where | Steps |
|------|-------|-------|
| Create Ontology | Ontology Manager | New → Fill Form → Save |
| Test Ontology | Test Runner | Select → Run → Review |
| Import Document | Import Monitor | Upload → Preview → Execute |
| Configure Ratings | Fact Rating Config | New → Set Examples → Test |
| Assign Ontology | User Assignments | New → Select Target → Save |
| View Results | Dashboard | Check Metrics → Drill Down |

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save current work
- `Ctrl/Cmd + N`: Create new item
- `Ctrl/Cmd + F`: Search
- `Esc`: Cancel operation
- `?`: Show help

### Performance Targets

- Precision: >80%
- Recall: >75%
- F1 Score: >80%
- Processing: ~1MB/minute
- Response Time: <2 seconds

---

Thank you for using Krypton-Graph!