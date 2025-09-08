export interface DomainPattern {
  keywords: string[];
  phrases: string[];
  technicalTerms: string[];
  formatPatterns: RegExp[];
  weight: number;
}

export interface DetectedDomain {
  name: string;
  confidence: number;
  indicators: string[];
  suggestedTypes: string[];
}

export interface DomainTemplate {
  id: string;
  name: string;
  description: string;
  entityTypes: Array<{
    name: string;
    description: string;
    examples: string[];
    attributes: string[];
  }>;
  edgeTypes: Array<{
    name: string;
    description: string;
    sourceTypes: string[];
    targetTypes: string[];
  }>;
  patterns: DomainPattern;
  prompts: {
    entityExtraction: string;
    relationshipExtraction: string;
    classification: string;
  };
}

export class DomainDetector {
  private domainPatterns: Map<string, DomainPattern>;
  private domainTemplates: Map<string, DomainTemplate>;

  constructor() {
    this.domainPatterns = new Map();
    this.domainTemplates = new Map();
    this.initializeDomainPatterns();
    this.initializeDomainTemplates();
  }

  private initializeDomainPatterns(): void {
    // Legal domain patterns
    this.domainPatterns.set('legal', {
      keywords: [
        'contract', 'agreement', 'lawsuit', 'litigation', 'plaintiff', 'defendant',
        'attorney', 'lawyer', 'court', 'judge', 'jury', 'legal', 'law', 'statute',
        'regulation', 'compliance', 'patent', 'trademark', 'copyright', 'liability',
        'settlement', 'damages', 'injunction', 'subpoena', 'deposition', 'motion',
        'brief', 'hearing', 'trial', 'verdict', 'appeal', 'jurisdiction'
      ],
      phrases: [
        'terms and conditions', 'legal proceeding', 'due process', 'case law',
        'legal entity', 'intellectual property', 'breach of contract', 'legal counsel',
        'court order', 'legal obligation', 'statutory requirement', 'regulatory framework',
        'legal precedent', 'fiduciary duty', 'legal standing', 'cause of action'
      ],
      technicalTerms: [
        'voir dire', 'habeas corpus', 'prima facie', 'res judicata', 'stare decisis',
        'pro bono', 'amicus curiae', 'in camera', 'ex parte', 'de facto', 'de jure'
      ],
      formatPatterns: [
        /\b\d{4}\s+U\.S\.\s+\d+\b/, // Case citations
        /\b\d+\s+F\.\d+\s+\d+\b/,   // Federal reporter citations
        /§\s*\d+/,                   // Section symbols
        /Art\.\s*[IVX]+/             // Article references
      ],
      weight: 1.0
    });

    // Medical/Healthcare domain patterns
    this.domainPatterns.set('medical', {
      keywords: [
        'patient', 'diagnosis', 'treatment', 'symptom', 'disease', 'condition',
        'medication', 'prescription', 'dosage', 'therapy', 'surgery', 'procedure',
        'hospital', 'clinic', 'doctor', 'physician', 'nurse', 'medical', 'health',
        'healthcare', 'clinical', 'pathology', 'radiology', 'cardiology', 'oncology',
        'neurology', 'psychiatry', 'pediatrics', 'emergency', 'intensive care'
      ],
      phrases: [
        'medical history', 'vital signs', 'blood pressure', 'heart rate',
        'medical record', 'patient care', 'health condition', 'treatment plan',
        'medical procedure', 'clinical trial', 'adverse reaction', 'side effect',
        'medical device', 'healthcare provider', 'informed consent', 'medical ethics'
      ],
      technicalTerms: [
        'myocardial infarction', 'cerebrovascular accident', 'pneumonia', 'diabetes mellitus',
        'hypertension', 'tachycardia', 'bradycardia', 'arrhythmia', 'angioplasty',
        'chemotherapy', 'radiotherapy', 'biopsy', 'CT scan', 'MRI', 'ultrasound'
      ],
      formatPatterns: [
        /\b\d{3}\.\d{1,2}\b/,        // ICD codes
        /\b[A-Z]\d{2}\.\d{3}\b/,     // ICD-10 codes
        /\b\d{2,3}\/\d{2,3}\b/,      // Blood pressure readings
        /\bmg\/dL\b/,                // Medical units
        /\bml\/min\b/                // Flow rates
      ],
      weight: 1.0
    });

    // Financial/Accounting domain patterns
    this.domainPatterns.set('financial', {
      keywords: [
        'revenue', 'expense', 'profit', 'loss', 'budget', 'cost', 'income', 'investment',
        'asset', 'liability', 'equity', 'balance', 'account', 'financial', 'accounting',
        'audit', 'tax', 'payroll', 'invoice', 'payment', 'transaction', 'cash flow',
        'depreciation', 'amortization', 'capital', 'debt', 'credit', 'interest', 'dividend'
      ],
      phrases: [
        'balance sheet', 'income statement', 'cash flow statement', 'profit and loss',
        'accounts payable', 'accounts receivable', 'cost of goods sold', 'gross margin',
        'net income', 'operating expense', 'capital expenditure', 'working capital',
        'return on investment', 'financial statement', 'tax liability', 'credit rating'
      ],
      technicalTerms: [
        'EBITDA', 'GAAP', 'IFRS', 'ROI', 'ROE', 'EPS', 'P/E ratio', 'WACC',
        'NPV', 'IRR', 'DCF', 'CAPEX', 'OPEX', 'COGS', 'SG&A', 'FIFO', 'LIFO'
      ],
      formatPatterns: [
        /\$[\d,]+\.?\d*/, // Currency amounts
        /\b\d+\.\d{2}%\b/, // Percentages with decimals
        /\bQ[1-4]\s+\d{4}\b/, // Quarterly references
        /\bFY\s*\d{4}\b/ // Fiscal year references
      ],
      weight: 1.0
    });

    // Technical/Engineering domain patterns
    this.domainPatterns.set('technical', {
      keywords: [
        'system', 'software', 'hardware', 'network', 'database', 'server', 'client',
        'application', 'program', 'code', 'algorithm', 'data', 'architecture', 'design',
        'implementation', 'deployment', 'maintenance', 'performance', 'security',
        'integration', 'testing', 'debugging', 'optimization', 'scalability', 'API',
        'framework', 'library', 'protocol', 'infrastructure', 'cloud', 'platform'
      ],
      phrases: [
        'software development', 'system architecture', 'data structure', 'machine learning',
        'artificial intelligence', 'user interface', 'user experience', 'quality assurance',
        'version control', 'continuous integration', 'agile development', 'technical debt',
        'code review', 'system requirements', 'technical specification', 'load balancing'
      ],
      technicalTerms: [
        'HTTP', 'HTTPS', 'REST', 'API', 'JSON', 'XML', 'SQL', 'NoSQL', 'TCP/IP',
        'SSL/TLS', 'OAuth', 'JWT', 'CRUD', 'MVC', 'SaaS', 'PaaS', 'IaaS', 'DevOps',
        'CI/CD', 'Docker', 'Kubernetes', 'microservices', 'serverless'
      ],
      formatPatterns: [
        /\bhttps?:\/\/[^\s]+/, // URLs
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
        /\b[A-Z]{2,10}_[A-Z_]+\b/, // Constants
        /\bv\d+\.\d+\.\d+\b/ // Version numbers
      ],
      weight: 1.0
    });

    // Academic/Research domain patterns
    this.domainPatterns.set('academic', {
      keywords: [
        'research', 'study', 'analysis', 'methodology', 'hypothesis', 'theory',
        'experiment', 'data', 'sample', 'population', 'statistical', 'correlation',
        'causation', 'variable', 'control', 'peer review', 'publication', 'journal',
        'conference', 'thesis', 'dissertation', 'academic', 'scholarly', 'citation',
        'bibliography', 'abstract', 'introduction', 'conclusion', 'results', 'discussion'
      ],
      phrases: [
        'literature review', 'research question', 'null hypothesis', 'alternative hypothesis',
        'statistical significance', 'confidence interval', 'p-value', 'effect size',
        'sample size', 'data collection', 'qualitative research', 'quantitative research',
        'case study', 'longitudinal study', 'cross-sectional study', 'meta-analysis'
      ],
      technicalTerms: [
        'ANOVA', 'regression', 'correlation', 't-test', 'chi-square', 'Mann-Whitney',
        'Wilcoxon', 'Kruskal-Wallis', 'post-hoc', 'Bonferroni', 'Cohen\'s d', 'eta-squared'
      ],
      formatPatterns: [
        /\bp\s*<\s*0\.\d+/, // P-values
        /\b\d{4}[a-z]?\)\b/, // Year citations
        /\bet\s+al\./, // Et al citations
        /\bvol\.\s*\d+/, // Volume references
        /\bpp\.\s*\d+[-–]\d+/ // Page ranges
      ],
      weight: 1.0
    });
  }

  private initializeDomainTemplates(): void {
    // Legal domain template
    this.domainTemplates.set('legal', {
      id: 'legal',
      name: 'Legal Documents',
      description: 'Types and relationships for legal domain documents',
      entityTypes: [
        {
          name: 'Legal Entity',
          description: 'Organizations, individuals, or entities with legal standing',
          examples: ['Corporation', 'LLC', 'Individual', 'Government Agency'],
          attributes: ['name', 'type', 'jurisdiction', 'registration_date']
        },
        {
          name: 'Legal Document',
          description: 'Contracts, agreements, and legal filings',
          examples: ['Contract', 'Agreement', 'Motion', 'Brief'],
          attributes: ['document_type', 'execution_date', 'parties', 'jurisdiction']
        },
        {
          name: 'Legal Proceeding',
          description: 'Court cases, trials, and legal processes',
          examples: ['Lawsuit', 'Trial', 'Hearing', 'Appeal'],
          attributes: ['case_number', 'court', 'filing_date', 'status']
        },
        {
          name: 'Legal Professional',
          description: 'Attorneys, judges, and legal practitioners',
          examples: ['Attorney', 'Judge', 'Paralegal', 'Legal Clerk'],
          attributes: ['name', 'bar_number', 'specialization', 'jurisdiction']
        }
      ],
      edgeTypes: [
        {
          name: 'Represents',
          description: 'Legal professional represents a party',
          sourceTypes: ['Legal Professional'],
          targetTypes: ['Legal Entity']
        },
        {
          name: 'Party To',
          description: 'Entity is party to a legal document or proceeding',
          sourceTypes: ['Legal Entity'],
          targetTypes: ['Legal Document', 'Legal Proceeding']
        },
        {
          name: 'Cites',
          description: 'Document cites another legal document or case',
          sourceTypes: ['Legal Document'],
          targetTypes: ['Legal Document', 'Legal Proceeding']
        }
      ],
      patterns: this.domainPatterns.get('legal')!,
      prompts: {
        entityExtraction: 'Extract legal entities including parties, documents, proceedings, and legal professionals from the text.',
        relationshipExtraction: 'Identify relationships such as representation, party involvement, and document citations.',
        classification: 'Classify text elements according to legal document structure and legal concepts.'
      }
    });

    // Medical domain template
    this.domainTemplates.set('medical', {
      id: 'medical',
      name: 'Medical Records',
      description: 'Types and relationships for healthcare documents',
      entityTypes: [
        {
          name: 'Patient',
          description: 'Individual receiving medical care',
          examples: ['Patient', 'Subject', 'Individual'],
          attributes: ['patient_id', 'age', 'gender', 'medical_record_number']
        },
        {
          name: 'Medical Condition',
          description: 'Diseases, disorders, and health conditions',
          examples: ['Hypertension', 'Diabetes', 'Pneumonia', 'Fracture'],
          attributes: ['ICD_code', 'severity', 'onset_date', 'status']
        },
        {
          name: 'Medical Procedure',
          description: 'Treatments, surgeries, and diagnostic procedures',
          examples: ['Surgery', 'X-ray', 'Blood Test', 'Physical Therapy'],
          attributes: ['procedure_code', 'date', 'duration', 'outcome']
        },
        {
          name: 'Healthcare Provider',
          description: 'Medical professionals and healthcare facilities',
          examples: ['Doctor', 'Nurse', 'Hospital', 'Clinic'],
          attributes: ['name', 'specialization', 'license_number', 'facility_type']
        },
        {
          name: 'Medication',
          description: 'Drugs, prescriptions, and treatments',
          examples: ['Aspirin', 'Insulin', 'Antibiotic', 'Chemotherapy'],
          attributes: ['drug_name', 'dosage', 'frequency', 'route']
        }
      ],
      edgeTypes: [
        {
          name: 'Diagnoses',
          description: 'Healthcare provider diagnoses condition in patient',
          sourceTypes: ['Healthcare Provider'],
          targetTypes: ['Medical Condition']
        },
        {
          name: 'Has Condition',
          description: 'Patient has medical condition',
          sourceTypes: ['Patient'],
          targetTypes: ['Medical Condition']
        },
        {
          name: 'Prescribes',
          description: 'Provider prescribes medication to patient',
          sourceTypes: ['Healthcare Provider'],
          targetTypes: ['Medication']
        },
        {
          name: 'Undergoes',
          description: 'Patient undergoes medical procedure',
          sourceTypes: ['Patient'],
          targetTypes: ['Medical Procedure']
        }
      ],
      patterns: this.domainPatterns.get('medical')!,
      prompts: {
        entityExtraction: 'Extract medical entities including patients, conditions, procedures, providers, and medications.',
        relationshipExtraction: 'Identify relationships such as diagnoses, treatments, prescriptions, and care provider interactions.',
        classification: 'Classify medical content according to clinical terminology and healthcare documentation standards.'
      }
    });

    // Add other domain templates (financial, technical, academic) similarly...
    // For brevity, I'll add the financial template as an example

    this.domainTemplates.set('financial', {
      id: 'financial',
      name: 'Financial Documents',
      description: 'Types and relationships for financial and accounting documents',
      entityTypes: [
        {
          name: 'Financial Account',
          description: 'Bank accounts, investment accounts, and financial instruments',
          examples: ['Checking Account', 'Savings Account', 'Investment Portfolio'],
          attributes: ['account_number', 'account_type', 'balance', 'currency']
        },
        {
          name: 'Transaction',
          description: 'Financial transactions and money movements',
          examples: ['Payment', 'Transfer', 'Investment', 'Withdrawal'],
          attributes: ['amount', 'date', 'type', 'currency']
        },
        {
          name: 'Financial Entity',
          description: 'Banks, companies, and financial institutions',
          examples: ['Bank', 'Corporation', 'Investment Fund', 'Credit Union'],
          attributes: ['name', 'type', 'registration_number', 'regulatory_status']
        },
        {
          name: 'Financial Instrument',
          description: 'Stocks, bonds, and other financial products',
          examples: ['Stock', 'Bond', 'Option', 'Future'],
          attributes: ['symbol', 'type', 'market', 'value']
        }
      ],
      edgeTypes: [
        {
          name: 'Owns',
          description: 'Entity owns financial account or instrument',
          sourceTypes: ['Financial Entity'],
          targetTypes: ['Financial Account', 'Financial Instrument']
        },
        {
          name: 'Transacts',
          description: 'Entity participates in transaction',
          sourceTypes: ['Financial Entity'],
          targetTypes: ['Transaction']
        },
        {
          name: 'Contains',
          description: 'Account contains financial instruments',
          sourceTypes: ['Financial Account'],
          targetTypes: ['Financial Instrument']
        }
      ],
      patterns: this.domainPatterns.get('financial')!,
      prompts: {
        entityExtraction: 'Extract financial entities including accounts, transactions, institutions, and instruments.',
        relationshipExtraction: 'Identify financial relationships such as ownership, transactions, and account holdings.',
        classification: 'Classify financial content according to accounting standards and financial terminology.'
      }
    });
  }

  async detectDomains(content: string): Promise<DetectedDomain[]> {
    const domains: DetectedDomain[] = [];
    const contentLower = content.toLowerCase();

    for (const [domainName, pattern] of this.domainPatterns.entries()) {
      const indicators: string[] = [];
      let score = 0;

      // Check keywords
      const keywordMatches = pattern.keywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      score += keywordMatches.length * 0.5;
      indicators.push(...keywordMatches.map(k => `keyword: ${k}`));

      // Check phrases
      const phraseMatches = pattern.phrases.filter(phrase => 
        contentLower.includes(phrase.toLowerCase())
      );
      score += phraseMatches.length * 1.0;
      indicators.push(...phraseMatches.map(p => `phrase: ${p}`));

      // Check technical terms
      const termMatches = pattern.technicalTerms.filter(term => 
        contentLower.includes(term.toLowerCase())
      );
      score += termMatches.length * 1.5;
      indicators.push(...termMatches.map(t => `technical term: ${t}`));

      // Check format patterns
      const formatMatches = pattern.formatPatterns.filter(regex => 
        regex.test(content)
      );
      score += formatMatches.length * 2.0;
      indicators.push(...formatMatches.map((_, i) => `format pattern ${i + 1}`));

      // Apply domain weight
      score *= pattern.weight;

      // Calculate confidence (normalize by content length and expected matches)
      const maxPossibleScore = (pattern.keywords.length * 0.5) + 
                               (pattern.phrases.length * 1.0) + 
                               (pattern.technicalTerms.length * 1.5) + 
                               (pattern.formatPatterns.length * 2.0);
      const confidence = Math.min(score / (maxPossibleScore * 0.1), 1.0);

      if (confidence > 0.1) { // Only include domains with reasonable confidence
        const template = this.domainTemplates.get(domainName);
        const suggestedTypes = template?.entityTypes.map(et => et.name) || [];

        domains.push({
          name: domainName,
          confidence,
          indicators: indicators.slice(0, 10), // Limit indicators shown
          suggestedTypes
        });
      }
    }

    // Sort by confidence and return top domains
    return domains.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  getDomainTemplate(domainName: string): DomainTemplate | null {
    return this.domainTemplates.get(domainName.toLowerCase()) || null;
  }

  getAllDomainTemplates(): DomainTemplate[] {
    return Array.from(this.domainTemplates.values());
  }

  generateDomainSpecificPrompts(domainName: string, taskType: 'entity' | 'relationship' | 'classification'): string | null {
    const template = this.domainTemplates.get(domainName.toLowerCase());
    if (!template) return null;

    switch (taskType) {
      case 'entity':
        return template.prompts.entityExtraction;
      case 'relationship':
        return template.prompts.relationshipExtraction;
      case 'classification':
        return template.prompts.classification;
      default:
        return null;
    }
  }

  async generateDomainAwareTypes(
    content: string,
    detectedDomains?: DetectedDomain[]
  ): Promise<Array<{
    type: string;
    description: string;
    confidence: number;
    domain: string;
  }>> {
    const domains = detectedDomains || await this.detectDomains(content);
    const suggestions: Array<{
      type: string;
      description: string;
      confidence: number;
      domain: string;
    }> = [];

    for (const domain of domains.slice(0, 3)) { // Top 3 domains
      const template = this.getDomainTemplate(domain.name);
      if (template) {
        for (const entityType of template.entityTypes) {
          // Check if content likely contains this type
          const typeRelevance = this.calculateTypeRelevance(content, entityType, domain);
          if (typeRelevance > 0.3) {
            suggestions.push({
              type: entityType.name,
              description: entityType.description,
              confidence: typeRelevance * domain.confidence,
              domain: domain.name
            });
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  private calculateTypeRelevance(
    content: string,
    entityType: any,
    domain: DetectedDomain
  ): number {
    const contentLower = content.toLowerCase();
    let relevance = 0;

    // Check if examples appear in content
    const exampleMatches = entityType.examples.filter((example: string) =>
      contentLower.includes(example.toLowerCase())
    ).length;
    relevance += exampleMatches * 0.4;

    // Check if type name appears in content
    if (contentLower.includes(entityType.name.toLowerCase())) {
      relevance += 0.3;
    }

    // Check attributes relevance
    const attributeMatches = entityType.attributes.filter((attr: string) =>
      contentLower.includes(attr.replace('_', ' ').toLowerCase())
    ).length;
    relevance += attributeMatches * 0.1;

    // Boost relevance based on domain confidence
    relevance *= (0.5 + domain.confidence * 0.5);

    return Math.min(relevance, 1.0);
  }

  async analyzeDomainFit(
    content: string,
    currentTypes: string[]
  ): Promise<{
    domainAlignment: number;
    missingDomainTypes: string[];
    inappropriateTypes: string[];
    suggestions: string[];
  }> {
    const detectedDomains = await this.detectDomains(content);
    const domainSpecificTypes = await this.generateDomainAwareTypes(content, detectedDomains);

    // Calculate how well current types align with detected domains
    const domainTypeNames = new Set(domainSpecificTypes.map(dst => dst.type.toLowerCase()));
    const currentTypeNames = new Set(currentTypes.map(ct => ct.toLowerCase()));

    const alignedTypes = Array.from(currentTypeNames).filter(ct => 
      domainTypeNames.has(ct)
    );
    const domainAlignment = currentTypes.length > 0 ? 
      alignedTypes.length / currentTypes.length : 0;

    // Find missing domain-specific types
    const missingDomainTypes = domainSpecificTypes
      .filter(dst => !currentTypeNames.has(dst.type.toLowerCase()))
      .map(dst => dst.type)
      .slice(0, 5);

    // Find potentially inappropriate types (not domain-specific)
    const inappropriateTypes = currentTypes.filter(ct => 
      !domainTypeNames.has(ct.toLowerCase()) &&
      !['Entity', 'Document', 'Person', 'Organization'].includes(ct) // Keep generic types
    );

    // Generate improvement suggestions
    const suggestions: string[] = [];
    
    if (domainAlignment < 0.7) {
      suggestions.push('Consider using more domain-specific entity types');
    }
    
    if (missingDomainTypes.length > 0) {
      suggestions.push(`Add ${missingDomainTypes.slice(0, 2).join(' and ')} types for better domain coverage`);
    }
    
    if (inappropriateTypes.length > 0) {
      suggestions.push(`Review ${inappropriateTypes[0]} - may not be appropriate for this domain`);
    }

    const topDomain = detectedDomains[0];
    if (topDomain && topDomain.confidence > 0.7) {
      suggestions.push(`Consider using the ${topDomain.name} domain template as a starting point`);
    }

    return {
      domainAlignment,
      missingDomainTypes,
      inappropriateTypes,
      suggestions
    };
  }

  addCustomDomainPattern(domainName: string, pattern: DomainPattern): void {
    this.domainPatterns.set(domainName.toLowerCase(), pattern);
  }

  addCustomDomainTemplate(template: DomainTemplate): void {
    this.domainTemplates.set(template.id.toLowerCase(), template);
  }
}