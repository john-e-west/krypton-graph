import { ClassificationAnalyzer, ClassificationItem, OntologyType } from '../classification-analyzer';

describe('ClassificationAnalyzer', () => {
  let analyzer: ClassificationAnalyzer;
  let mockItems: ClassificationItem[];
  let mockOntologyTypes: OntologyType[];

  beforeEach(() => {
    analyzer = new ClassificationAnalyzer();

    mockItems = [
      {
        id: '1',
        text: 'John Smith is the CEO of Acme Corporation',
        classification: 'Person',
        confidence: 0.9,
      },
      {
        id: '2',
        text: 'The quarterly financial report shows increased revenue',
        classification: 'Document',
        confidence: 0.8,
      },
      {
        id: '3',
        text: 'AI-powered software platform for data analysis',
        classification: undefined, // Unclassified
        confidence: 0.4,
      },
      {
        id: '4',
        text: 'Meeting scheduled for next Tuesday at 2pm',
        classification: 'Event',
        confidence: 0.6,
      },
      {
        id: '5',
        text: 'The new product launch campaign',
        classification: undefined, // Unclassified
        confidence: 0.3,
      },
    ];

    mockOntologyTypes = [
      {
        id: '1',
        name: 'Person',
        description: 'Individual people',
        examples: ['John Smith', 'CEO', 'employee'],
        usage_count: 25,
        success_rate: 0.9,
      },
      {
        id: '2',
        name: 'Document',
        description: 'Written materials and reports',
        examples: ['report', 'document', 'file'],
        usage_count: 40,
        success_rate: 0.85,
      },
      {
        id: '3',
        name: 'Event',
        description: 'Meetings and scheduled activities',
        examples: ['meeting', 'conference', 'workshop'],
        usage_count: 15,
        success_rate: 0.7,
      },
      {
        id: '4',
        name: 'Very Specific Unused Type',
        description: 'A type that is rarely used',
        examples: ['rare example'],
        usage_count: 2,
        success_rate: 0.4,
      },
      {
        id: '5',
        name: 'Overly Broad Type',
        description: 'A type that captures too much',
        examples: ['everything'],
        usage_count: 100,
        success_rate: 0.6,
      },
    ];
  });

  describe('analyzeClassification', () => {
    it('should calculate correct classification statistics', async () => {
      const { stats } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      expect(stats.totalItems).toBe(5);
      expect(stats.classifiedItems).toBe(2); // Only items with confidence >= 0.7
      expect(stats.unclassifiedItems).toBe(3);
      expect(stats.classificationRate).toBe(0.4);
      expect(stats.confidenceScores).toHaveLength(5);
    });

    it('should identify common failure patterns', async () => {
      const itemsWithPatterns = [
        ...mockItems,
        { id: '6', text: 'A', classification: undefined, confidence: 0.1 }, // Very short
        { id: '7', text: 'B', classification: undefined, confidence: 0.1 }, // Very short
        { id: '8', text: 'C', classification: undefined, confidence: 0.1 }, // Very short
      ];

      const { stats } = await analyzer.analyzeClassification(itemsWithPatterns, mockOntologyTypes);

      expect(stats.commonFailurePatterns).toContain('Very short text');
    });

    it('should identify missing type categories', async () => {
      const itemsNeedingTechCategory = [
        { id: '1', text: 'Software system implementation', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'Database platform migration', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'API integration technology', classification: undefined, confidence: 0.3 },
        { id: '4', text: 'Technology stack selection', classification: undefined, confidence: 0.3 },
      ];

      const { analysis } = await analyzer.analyzeClassification(itemsNeedingTechCategory, mockOntologyTypes);

      expect(analysis.issues.missingTypeCategories).toContain('Technology');
    });

    it('should identify overly specific types', async () => {
      const { analysis } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      expect(analysis.issues.overlySpecificTypes).toContain('Very Specific Unused Type');
    });

    it('should identify overly broad types', async () => {
      const { analysis } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      expect(analysis.issues.overlyBroadTypes).toContain('Overly Broad Type');
    });

    it('should generate type adjustment suggestions', async () => {
      const { analysis } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      const adjustments = analysis.suggestions.typeAdjustments;
      expect(adjustments.length).toBeGreaterThan(0);
      
      const specificTypeAdjustment = adjustments.find(adj => 
        adj.currentType === 'Very Specific Unused Type'
      );
      expect(specificTypeAdjustment).toBeDefined();
    });

    it('should generate improvement actions', async () => {
      const { analysis } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      expect(analysis.suggestions.improvementActions.length).toBeGreaterThan(0);
      
      const actions = analysis.suggestions.improvementActions.map(action => action.action);
      expect(actions).toContain('Enhance Classification Prompts');
    });

    it('should find difficult classification examples', async () => {
      const { analysis } = await analyzer.analyzeClassification(mockItems, mockOntologyTypes);

      expect(analysis.examples.length).toBeGreaterThan(0);
      expect(analysis.examples[0].confidence).toBeLessThan(0.6);
    });

    it('should handle empty input gracefully', async () => {
      const { stats, analysis } = await analyzer.analyzeClassification([], []);

      expect(stats.totalItems).toBe(0);
      expect(stats.classificationRate).toBe(0);
      expect(analysis.issues.missingTypeCategories).toHaveLength(0);
      expect(analysis.suggestions.newTypeCategories).toHaveLength(0);
      expect(analysis.examples).toHaveLength(0);
    });
  });

  describe('generateImprovementReport', () => {
    it('should generate a comprehensive improvement report', async () => {
      const report = await analyzer.generateImprovementReport(mockItems, mockOntologyTypes);

      expect(report.summary).toContain('40%'); // Current classification rate
      expect(report.priorityActions.length).toBeGreaterThan(0);
      expect(report.expectedImprovement).toBeGreaterThan(0);
      expect(report.expectedImprovement).toBeLessThanOrEqual(0.6); // Can't exceed 100% rate
    });

    it('should provide realistic improvement estimates', async () => {
      const poorlyClassifiedItems = [
        { id: '1', text: 'Unclassified item 1', classification: undefined, confidence: 0.2 },
        { id: '2', text: 'Unclassified item 2', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Unclassified item 3', classification: undefined, confidence: 0.1 },
        { id: '4', text: 'Classified item', classification: 'Person', confidence: 0.9 },
      ];

      const report = await analyzer.generateImprovementReport(poorlyClassifiedItems, mockOntologyTypes);

      expect(report.expectedImprovement).toBeGreaterThan(0);
      expect(report.expectedImprovement).toBeLessThanOrEqual(0.75); // Max improvement to 100%
    });
  });

  describe('failure pattern detection', () => {
    it('should detect short text patterns', async () => {
      const shortTextItems = [
        { id: '1', text: 'A', classification: undefined, confidence: 0.1 },
        { id: '2', text: 'B', classification: undefined, confidence: 0.1 },
        { id: '3', text: 'C', classification: undefined, confidence: 0.1 },
        { id: '4', text: 'Normal length text that should classify fine', classification: 'Document', confidence: 0.8 },
      ];

      const { stats } = await analyzer.analyzeClassification(shortTextItems, mockOntologyTypes);

      expect(stats.commonFailurePatterns).toContain('Very short text');
    });

    it('should detect complex formatting patterns', async () => {
      const complexItems = [
        { id: '1', text: '$1,234.56 - Special!@#', classification: undefined, confidence: 0.2 },
        { id: '2', text: '€999.99 & More!!!', classification: undefined, confidence: 0.2 },
        { id: '3', text: '£500.00 + Tax***', classification: undefined, confidence: 0.2 },
      ];

      const { stats } = await analyzer.analyzeClassification(complexItems, mockOntologyTypes);

      expect(stats.commonFailurePatterns).toContain('Complex formatting');
    });

    it('should detect financial/numerical patterns', async () => {
      const financialItems = [
        { id: '1', text: 'Revenue of $50,000 for Q3', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'Budget allocation €25,000', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Cost analysis 123.45', classification: undefined, confidence: 0.3 },
      ];

      const { stats } = await analyzer.analyzeClassification(financialItems, mockOntologyTypes);

      expect(stats.commonFailurePatterns).toContain('Financial/numerical data');
    });

    it('should detect document structure references', async () => {
      const structureItems = [
        { id: '1', text: 'See Appendix A for details', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'Refer to Section 3.1', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Chapter 5 discusses methodology', classification: undefined, confidence: 0.3 },
      ];

      const { stats } = await analyzer.analyzeClassification(structureItems, mockOntologyTypes);

      expect(stats.commonFailurePatterns).toContain('Document structure references');
    });
  });

  describe('domain-specific detection', () => {
    it('should suggest organizational categories', async () => {
      const orgItems = [
        { id: '1', text: 'The company restructured departments', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'Corporation team meeting', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Organization group project', classification: undefined, confidence: 0.3 },
        { id: '4', text: 'Department workflow changes', classification: undefined, confidence: 0.3 },
      ];

      const { analysis } = await analyzer.analyzeClassification(orgItems, mockOntologyTypes);

      expect(analysis.issues.missingTypeCategories).toContain('Organization');
    });

    it('should suggest process categories', async () => {
      const processItems = [
        { id: '1', text: 'Standard operating procedure updated', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'New workflow process implemented', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Method for quality control', classification: undefined, confidence: 0.3 },
        { id: '4', text: 'Step-by-step action plan', classification: undefined, confidence: 0.3 },
      ];

      const { analysis } = await analyzer.analyzeClassification(processItems, mockOntologyTypes);

      expect(analysis.issues.missingTypeCategories).toContain('Process');
    });

    it('should suggest financial categories', async () => {
      const financialItems = [
        { id: '1', text: 'Annual budget planning process', classification: undefined, confidence: 0.3 },
        { id: '2', text: 'Revenue stream analysis', classification: undefined, confidence: 0.3 },
        { id: '3', text: 'Cost reduction initiative', classification: undefined, confidence: 0.3 },
        { id: '4', text: 'Financial reporting requirements', classification: undefined, confidence: 0.3 },
      ];

      const { analysis } = await analyzer.analyzeClassification(financialItems, mockOntologyTypes);

      expect(analysis.issues.missingTypeCategories).toContain('Financial');
    });
  });

  describe('ambiguous pattern detection', () => {
    it('should identify patterns with inconsistent classifications', async () => {
      const inconsistentItems = [
        { id: '1', text: 'project management system', classification: 'Technology', confidence: 0.8 },
        { id: '2', text: 'project management approach', classification: 'Process', confidence: 0.8 },
        { id: '3', text: 'project management training', classification: 'Event', confidence: 0.8 },
      ];

      const { analysis } = await analyzer.analyzeClassification(inconsistentItems, mockOntologyTypes);

      expect(analysis.issues.ambiguousPatterns.length).toBeGreaterThan(0);
      expect(analysis.issues.ambiguousPatterns[0]).toContain('project management');
    });
  });

  describe('suggestion generation', () => {
    it('should suggest broader types for overly specific ones', async () => {
      const specificTypes = [
        {
          id: '1',
          name: 'Senior Software Engineer',
          description: 'Very specific role',
          examples: [],
          usage_count: 1,
          success_rate: 0.3,
        },
      ];

      const generalTypes = [
        {
          id: '2',
          name: 'Person',
          description: 'General person type',
          examples: [],
          usage_count: 50,
          success_rate: 0.9,
        },
      ];

      const { analysis } = await analyzer.analyzeClassification(mockItems, [...specificTypes, ...generalTypes]);

      const adjustment = analysis.suggestions.typeAdjustments.find(adj => 
        adj.currentType === 'Senior Software Engineer'
      );
      expect(adjustment).toBeDefined();
      expect(adjustment?.reason).toContain('too specific');
    });

    it('should generate high-impact improvement actions for critical issues', async () => {
      const poorItems = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        text: `Unclassified technology item ${i + 1}`,
        classification: undefined,
        confidence: 0.2,
      }));

      const { analysis } = await analyzer.analyzeClassification(poorItems, mockOntologyTypes);

      const highImpactActions = analysis.suggestions.improvementActions.filter(
        action => action.impact === 'high'
      );
      expect(highImpactActions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle items with missing confidence scores', async () => {
      const itemsWithoutConfidence = [
        { id: '1', text: 'Item without confidence', classification: 'Person' },
        { id: '2', text: 'Another item', classification: 'Document', confidence: 0.8 },
      ];

      const { stats } = await analyzer.analyzeClassification(itemsWithoutConfidence, mockOntologyTypes);

      expect(stats.totalItems).toBe(2);
      expect(stats.confidenceScores).toHaveLength(1); // Only items with confidence
    });

    it('should handle very high classification rates', async () => {
      const wellClassifiedItems = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        text: `Well classified item ${i + 1}`,
        classification: 'Person',
        confidence: 0.95,
      }));

      const { stats, analysis } = await analyzer.analyzeClassification(wellClassifiedItems, mockOntologyTypes);

      expect(stats.classificationRate).toBe(1.0);
      expect(analysis.suggestions.improvementActions.length).toBe(0);
    });

    it('should handle null/undefined text gracefully', async () => {
      const itemsWithBadText = [
        { id: '1', text: '', classification: undefined, confidence: 0.1 },
        { id: '2', text: '   ', classification: undefined, confidence: 0.1 },
      ];

      const { stats } = await analyzer.analyzeClassification(itemsWithBadText, mockOntologyTypes);

      expect(stats.totalItems).toBe(2);
      expect(stats.classificationRate).toBe(0);
    });
  });
});