import { ClassificationStats, ClassificationAnalysis } from '@/components/ontology/ClassificationHelper';

export interface ClassificationItem {
  id: string;
  text: string;
  classification?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface OntologyType {
  id: string;
  name: string;
  description: string;
  examples: string[];
  usage_count: number;
  success_rate: number;
}

export interface ClassificationPattern {
  pattern: string;
  success_rate: number;
  common_failures: string[];
  suggested_improvements: string[];
}

export class ClassificationAnalyzer {
  private readonly MIN_SUCCESS_RATE = 0.8;
  private readonly MIN_CONFIDENCE = 0.7;
  private readonly MIN_USAGE_THRESHOLD = 5;

  async analyzeClassification(
    items: ClassificationItem[],
    ontologyTypes: OntologyType[]
  ): Promise<{ stats: ClassificationStats; analysis: ClassificationAnalysis }> {
    const stats = this.calculateStats(items);
    const analysis = await this.performDiagnosticAnalysis(items, ontologyTypes, stats);

    return { stats, analysis };
  }

  private calculateStats(items: ClassificationItem[]): ClassificationStats {
    const totalItems = items.length;
    const classifiedItems = items.filter(item => 
      item.classification && item.confidence && item.confidence > this.MIN_CONFIDENCE
    ).length;
    const unclassifiedItems = totalItems - classifiedItems;
    const classificationRate = totalItems > 0 ? classifiedItems / totalItems : 0;

    const confidenceScores = items
      .filter(item => item.confidence !== undefined)
      .map(item => item.confidence!);

    const failurePatterns = this.identifyFailurePatterns(
      items.filter(item => !item.classification || (item.confidence || 0) < this.MIN_CONFIDENCE)
    );

    return {
      totalItems,
      classifiedItems,
      unclassifiedItems,
      classificationRate,
      confidenceScores,
      commonFailurePatterns: failurePatterns,
    };
  }

  private identifyFailurePatterns(failedItems: ClassificationItem[]): string[] {
    const patterns: Map<string, number> = new Map();

    failedItems.forEach(item => {
      // Analyze text characteristics that lead to failure
      const textLength = item.text.length;
      const wordCount = item.text.split(/\s+/).length;
      const hasNumbers = /\d/.test(item.text);
      const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(item.text);
      const isUpperCase = item.text === item.text.toUpperCase();

      if (textLength < 10) {
        patterns.set('Very short text', (patterns.get('Very short text') || 0) + 1);
      }
      if (textLength > 500) {
        patterns.set('Very long text', (patterns.get('Very long text') || 0) + 1);
      }
      if (wordCount < 3) {
        patterns.set('Few words', (patterns.get('Few words') || 0) + 1);
      }
      if (hasNumbers && hasSpecialChars) {
        patterns.set('Complex formatting', (patterns.get('Complex formatting') || 0) + 1);
      }
      if (isUpperCase && textLength > 20) {
        patterns.set('All caps text', (patterns.get('All caps text') || 0) + 1);
      }

      // Domain-specific patterns
      if (/\b(table|figure|chart|diagram)\b/i.test(item.text)) {
        patterns.set('Visual content references', (patterns.get('Visual content references') || 0) + 1);
      }
      if (/\b(appendix|section|chapter|page)\b/i.test(item.text)) {
        patterns.set('Document structure references', (patterns.get('Document structure references') || 0) + 1);
      }
      if (/\$|€|£|¥|\d+\.\d+/.test(item.text)) {
        patterns.set('Financial/numerical data', (patterns.get('Financial/numerical data') || 0) + 1);
      }
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private async performDiagnosticAnalysis(
    items: ClassificationItem[],
    ontologyTypes: OntologyType[],
    stats: ClassificationStats
  ): Promise<ClassificationAnalysis> {
    const issues = await this.identifyIssues(items, ontologyTypes);
    const suggestions = await this.generateSuggestions(items, ontologyTypes, issues);
    const examples = this.findDifficultExamples(items);

    return {
      issues,
      suggestions,
      examples,
    };
  }

  private async identifyIssues(
    items: ClassificationItem[],
    ontologyTypes: OntologyType[]
  ): Promise<ClassificationAnalysis['issues']> {
    const issues = {
      missingTypeCategories: [] as string[],
      overlySpecificTypes: [] as string[],
      overlyBroadTypes: [] as string[],
      ambiguousPatterns: [] as string[],
    };

    // Identify missing categories by analyzing unclassified text patterns
    const unclassifiedItems = items.filter(item => !item.classification);
    const missingCategories = await this.detectMissingCategories(unclassifiedItems);
    issues.missingTypeCategories = missingCategories;

    // Identify overly specific types (low usage, high failure rate)
    const overlySpecific = ontologyTypes.filter(type => 
      type.usage_count < this.MIN_USAGE_THRESHOLD && type.success_rate < 0.6
    ).map(type => type.name);
    issues.overlySpecificTypes = overlySpecific;

    // Identify overly broad types (high usage, many edge cases)
    const overlyBroad = ontologyTypes.filter(type => 
      type.usage_count > 50 && type.success_rate < 0.7
    ).map(type => type.name);
    issues.overlyBroadTypes = overlyBroad;

    // Identify ambiguous patterns
    const ambiguousPatterns = this.findAmbiguousPatterns(items);
    issues.ambiguousPatterns = ambiguousPatterns;

    return issues;
  }

  private async detectMissingCategories(unclassifiedItems: ClassificationItem[]): Promise<string[]> {
    const categories: Map<string, number> = new Map();

    // Use simple heuristics to suggest missing categories
    unclassifiedItems.forEach(item => {
      const text = item.text.toLowerCase();

      // Business/organizational terms
      if (/\b(company|organization|corporation|department|team|group)\b/.test(text)) {
        categories.set('Organization', (categories.get('Organization') || 0) + 1);
      }

      // Process/action terms
      if (/\b(process|procedure|method|workflow|step|action)\b/.test(text)) {
        categories.set('Process', (categories.get('Process') || 0) + 1);
      }

      // Technical terms
      if (/\b(system|software|technology|platform|tool|api|database)\b/.test(text)) {
        categories.set('Technology', (categories.get('Technology') || 0) + 1);
      }

      // Financial terms
      if (/\b(cost|budget|revenue|expense|payment|financial|money)\b/.test(text)) {
        categories.set('Financial', (categories.get('Financial') || 0) + 1);
      }

      // Legal/compliance terms
      if (/\b(regulation|compliance|legal|law|requirement|policy|rule)\b/.test(text)) {
        categories.set('Legal/Compliance', (categories.get('Legal/Compliance') || 0) + 1);
      }

      // Time/scheduling terms
      if (/\b(schedule|timeline|deadline|date|time|duration|period)\b/.test(text)) {
        categories.set('Temporal', (categories.get('Temporal') || 0) + 1);
      }

      // Location/geographical terms
      if (/\b(location|place|address|region|country|city|office|site)\b/.test(text)) {
        categories.set('Location', (categories.get('Location') || 0) + 1);
      }

      // Quality/metrics terms
      if (/\b(quality|metric|measurement|performance|score|rating|kpi)\b/.test(text)) {
        categories.set('Quality/Metrics', (categories.get('Quality/Metrics') || 0) + 1);
      }
    });

    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count >= 3) // Only suggest categories with at least 3 occurrences
      .slice(0, 5)
      .map(([category]) => category);
  }

  private findAmbiguousPatterns(items: ClassificationItem[]): string[] {
    const patterns: string[] = [];

    // Group items by similar text patterns
    const patternGroups = new Map<string, ClassificationItem[]>();

    items.forEach(item => {
      // Extract key patterns from text - be more flexible with word length
      const words = item.text.toLowerCase().split(/\s+/);
      const keyWords = words.filter(word => 
        word.length > 3 && 
        !/\b(the|and|or|but|with|for|from|into|during|including|because|this|that|they|them)\b/.test(word)
      ).slice(0, 2); // Use fewer words for better matching

      if (keyWords.length >= 1) {
        const pattern = keyWords.join(' ');
        if (!patternGroups.has(pattern)) {
          patternGroups.set(pattern, []);
        }
        patternGroups.get(pattern)!.push(item);
      }
    });

    // Find patterns with inconsistent classifications - require at least 2 items
    patternGroups.forEach((groupItems, pattern) => {
      if (groupItems.length >= 2) {
        const classifications = new Set(
          groupItems.map(item => item.classification).filter(Boolean)
        );
        
        if (classifications.size > 1) {
          patterns.push(`"${pattern}" has inconsistent classifications`);
        }
      }
    });

    return patterns.slice(0, 5);
  }

  private async generateSuggestions(
    items: ClassificationItem[],
    ontologyTypes: OntologyType[],
    issues: ClassificationAnalysis['issues']
  ): Promise<ClassificationAnalysis['suggestions']> {
    const suggestions = {
      newTypeCategories: issues.missingTypeCategories,
      typeAdjustments: [] as Array<{
        currentType: string;
        suggestedType: string;
        reason: string;
      }>,
      improvementActions: [] as Array<{
        action: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
      }>,
    };

    // Generate type adjustment suggestions
    issues.overlySpecificTypes.forEach(type => {
      const broaderType = this.suggestBroaderType(type, ontologyTypes);
      if (broaderType) {
        suggestions.typeAdjustments.push({
          currentType: type,
          suggestedType: broaderType,
          reason: 'Current type is too specific and rarely used',
        });
      }
    });

    issues.overlyBroadTypes.forEach(type => {
      const moreSpecificTypes = this.suggestMoreSpecificTypes(type, ontologyTypes, items);
      moreSpecificTypes.forEach(specificType => {
        suggestions.typeAdjustments.push({
          currentType: type,
          suggestedType: specificType,
          reason: 'Current type is too broad, causing classification confusion',
        });
      });
    });

    // Generate improvement actions
    if (issues.missingTypeCategories.length > 0) {
      suggestions.improvementActions.push({
        action: 'Add Missing Type Categories',
        description: `Create ${issues.missingTypeCategories.length} new type categories to better classify unhandled content`,
        impact: 'high',
      });
    }

    if (issues.ambiguousPatterns.length > 0) {
      suggestions.improvementActions.push({
        action: 'Resolve Ambiguous Patterns',
        description: 'Review and consolidate inconsistent classification patterns',
        impact: 'medium',
      });
    }

    const lowConfidenceItems = items.filter(item => 
      item.confidence && item.confidence < this.MIN_CONFIDENCE
    );
    if (lowConfidenceItems.length > items.length * 0.2) {
      suggestions.improvementActions.push({
        action: 'Improve Type Definitions',
        description: 'Add more examples and clearer descriptions to existing types',
        impact: 'medium',
      });
    }

    const unclassifiedRate = (items.length - items.filter(item => item.classification).length) / items.length;
    if (unclassifiedRate > 0.3) {
      suggestions.improvementActions.push({
        action: 'Enhance Classification Prompts',
        description: 'Refine AI prompts to better handle edge cases and improve coverage',
        impact: 'high',
      });
    }

    return suggestions;
  }

  private suggestBroaderType(specificType: string, ontologyTypes: OntologyType[]): string | null {
    // Simple heuristic: find types with similar names but higher usage
    const words = specificType.toLowerCase().split(/\s+/);
    
    // Look for broader types that contain any word from the specific type
    const candidates = ontologyTypes.filter(type => 
      type.name !== specificType &&
      type.usage_count > this.MIN_USAGE_THRESHOLD &&
      words.some(word => type.name.toLowerCase().includes(word))
    );

    // If no direct word matches, look for semantic similarity
    if (candidates.length === 0) {
      // Check for common broader categories
      const specificLower = specificType.toLowerCase();
      
      if (/engineer|developer|programmer|architect/.test(specificLower)) {
        const personType = ontologyTypes.find(type => 
          type.name.toLowerCase() === 'person' || type.name.toLowerCase() === 'employee'
        );
        if (personType && personType.usage_count > this.MIN_USAGE_THRESHOLD) {
          return personType.name;
        }
      }
      
      if (/manager|director|ceo|officer/.test(specificLower)) {
        const personType = ontologyTypes.find(type => 
          type.name.toLowerCase() === 'person' || type.name.toLowerCase() === 'employee'
        );
        if (personType && personType.usage_count > this.MIN_USAGE_THRESHOLD) {
          return personType.name;
        }
      }
      
      if (/report|document|file|paper/.test(specificLower)) {
        const docType = ontologyTypes.find(type => 
          type.name.toLowerCase() === 'document'
        );
        if (docType && docType.usage_count > this.MIN_USAGE_THRESHOLD) {
          return docType.name;
        }
      }
    }

    return candidates.length > 0 ? candidates[0].name : null;
  }

  private suggestMoreSpecificTypes(
    broadType: string,
    ontologyTypes: OntologyType[],
    items: ClassificationItem[]
  ): string[] {
    // Analyze items classified as the broad type to suggest subdivisions
    const broadTypeItems = items.filter(item => item.classification === broadType);
    const suggestions: string[] = [];

    // Use clustering based on common terms
    const termFrequency = new Map<string, number>();
    broadTypeItems.forEach(item => {
      const terms = item.text.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 4 && !/^(the|and|or|but|with)/.test(term));
      
      terms.forEach(term => {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      });
    });

    const commonTerms = Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([term]) => term);

    commonTerms.forEach(term => {
      const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);
      suggestions.push(`${broadType} - ${capitalizedTerm}`);
    });

    return suggestions.slice(0, 2);
  }

  private findDifficultExamples(items: ClassificationItem[]): ClassificationAnalysis['examples'] {
    // Find items with low confidence or no classification
    const difficultItems = items.filter(item => 
      !item.classification || (item.confidence && item.confidence < 0.6)
    ).sort((a, b) => (a.confidence || 0) - (b.confidence || 0));

    return difficultItems.slice(0, 5).map(item => ({
      text: item.text,
      currentClassification: item.classification,
      suggestedClassification: this.suggestClassification(item.text),
      confidence: item.confidence || 0,
    }));
  }

  private suggestClassification(text: string): string {
    // Simple heuristic-based classification suggestions
    const lowerText = text.toLowerCase();

    if (/\b(person|people|individual|employee|user|customer)\b/.test(lowerText)) {
      return 'Person';
    }
    if (/\b(company|organization|business|enterprise|corporation)\b/.test(lowerText)) {
      return 'Organization';
    }
    if (/\b(product|service|software|tool|platform|system)\b/.test(lowerText)) {
      return 'Product/Service';
    }
    if (/\b(process|procedure|method|workflow|operation)\b/.test(lowerText)) {
      return 'Process';
    }
    if (/\b(document|report|file|record|data|information)\b/.test(lowerText)) {
      return 'Document';
    }
    if (/\b(event|meeting|conference|workshop|session)\b/.test(lowerText)) {
      return 'Event';
    }
    if (/\b(location|place|office|building|facility|site)\b/.test(lowerText)) {
      return 'Location';
    }
    if (/\b(date|time|schedule|deadline|period|duration)\b/.test(lowerText)) {
      return 'Temporal';
    }

    return 'General Concept';
  }

  async generateImprovementReport(
    items: ClassificationItem[],
    ontologyTypes: OntologyType[]
  ): Promise<{
    summary: string;
    priorityActions: string[];
    expectedImprovement: number;
  }> {
    const { stats, analysis } = await this.analyzeClassification(items, ontologyTypes);
    
    const currentRate = stats.classificationRate;
    const potentialImprovement = this.calculatePotentialImprovement(analysis, stats);
    
    const summary = `Classification rate is currently ${Math.round(currentRate * 100)}%. ` +
      `By implementing the suggested improvements, we expect to achieve ${Math.round((currentRate + potentialImprovement) * 100)}% classification rate.`;

    const priorityActions = analysis.suggestions.improvementActions
      .filter(action => action.impact === 'high')
      .map(action => action.action);

    return {
      summary,
      priorityActions,
      expectedImprovement: potentialImprovement,
    };
  }

  private calculatePotentialImprovement(
    analysis: ClassificationAnalysis,
    stats: ClassificationStats
  ): number {
    let improvement = 0;

    // Estimate improvement from adding missing categories
    if (analysis.issues.missingTypeCategories.length > 0) {
      improvement += 0.1; // 10% improvement
    }

    // Estimate improvement from resolving ambiguous patterns
    if (analysis.issues.ambiguousPatterns.length > 0) {
      improvement += 0.05; // 5% improvement
    }

    // Estimate improvement from type adjustments
    if (analysis.suggestions.typeAdjustments.length > 0) {
      improvement += analysis.suggestions.typeAdjustments.length * 0.02; // 2% per adjustment
    }

    return Math.min(improvement, 1 - stats.classificationRate); // Cap at 100% rate
  }
}