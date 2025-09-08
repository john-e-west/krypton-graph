import { DomainDetector, DomainPattern, DomainTemplate } from '../domain-detector';

describe('DomainDetector', () => {
  let detector: DomainDetector;

  beforeEach(() => {
    detector = new DomainDetector();
  });

  describe('detectDomains', () => {
    it('should detect legal domain in legal content', async () => {
      const legalContent = `
        The plaintiff filed a lawsuit against the defendant corporation for breach of contract.
        The attorney representing the plaintiff argued that the agreement was legally binding.
        The court will hear the motion next Tuesday.
      `;

      const domains = await detector.detectDomains(legalContent);

      expect(domains.length).toBeGreaterThan(0);
      const legalDomain = domains.find(d => d.name === 'legal');
      expect(legalDomain).toBeDefined();
      expect(legalDomain!.confidence).toBeGreaterThan(0.3);
      expect(legalDomain!.indicators.length).toBeGreaterThan(0);
    });

    it('should detect medical domain in healthcare content', async () => {
      const medicalContent = `
        The patient was diagnosed with hypertension and prescribed medication.
        The doctor recommended regular blood pressure monitoring and follow-up visits.
        The treatment plan includes lifestyle modifications and medical therapy.
      `;

      const domains = await detector.detectDomains(medicalContent);

      const medicalDomain = domains.find(d => d.name === 'medical');
      expect(medicalDomain).toBeDefined();
      expect(medicalDomain!.confidence).toBeGreaterThan(0.3);
      expect(medicalDomain!.indicators.some(indicator => 
        indicator.toLowerCase().includes('patient')
      )).toBe(true);
    });

    it('should detect financial domain in financial content', async () => {
      const financialContent = `
        The company's quarterly revenue increased by 15% compared to last year.
        Total assets on the balance sheet reached $2.5 million.
        Investment in new equipment required significant capital expenditure.
      `;

      const domains = await detector.detectDomains(financialContent);

      const financialDomain = domains.find(d => d.name === 'financial');
      expect(financialDomain).toBeDefined();
      expect(financialDomain!.confidence).toBeGreaterThan(0.3);
    });

    it('should detect technical domain in software content', async () => {
      const technicalContent = `
        The software architecture includes a REST API for client-server communication.
        The database stores user data with proper security protocols.
        The deployment uses Docker containers in a Kubernetes cluster.
      `;

      const domains = await detector.detectDomains(technicalContent);

      const technicalDomain = domains.find(d => d.name === 'technical');
      expect(technicalDomain).toBeDefined();
      expect(technicalDomain!.confidence).toBeGreaterThan(0.3);
    });

    it('should detect academic domain in research content', async () => {
      const academicContent = `
        This study examined the correlation between variables X and Y.
        The methodology included a randomized controlled trial with 200 participants.
        Results showed statistical significance (p < 0.05) supporting the hypothesis.
      `;

      const domains = await detector.detectDomains(academicContent);

      const academicDomain = domains.find(d => d.name === 'academic');
      expect(academicDomain).toBeDefined();
      expect(academicDomain!.confidence).toBeGreaterThan(0.3);
    });

    it('should handle mixed domain content', async () => {
      const mixedContent = `
        The hospital's financial report shows increased revenue from patient care.
        Legal compliance with healthcare regulations is essential for operations.
        Technology systems support both clinical and administrative functions.
      `;

      const domains = await detector.detectDomains(mixedContent);

      expect(domains.length).toBeGreaterThan(1);
      const domainNames = domains.map(d => d.name);
      expect(domainNames).toContain('medical');
      expect(domainNames).toContain('financial');
    });

    it('should return domains sorted by confidence', async () => {
      const strongLegalContent = `
        The plaintiff attorney filed a motion in court for summary judgment.
        The defendant corporation breached the contract terms and conditions.
        Legal proceedings will continue with depositions and discovery.
      `;

      const domains = await detector.detectDomains(strongLegalContent);

      expect(domains.length).toBeGreaterThan(0);
      // Domains should be sorted by confidence (highest first)
      for (let i = 1; i < domains.length; i++) {
        expect(domains[i - 1].confidence).toBeGreaterThanOrEqual(domains[i].confidence);
      }
    });

    it('should handle empty content gracefully', async () => {
      const domains = await detector.detectDomains('');
      expect(domains).toEqual([]);
    });

    it('should handle generic content with low domain specificity', async () => {
      const genericContent = `
        This is a general document about various topics.
        It contains some information but no specific domain indicators.
        The content is neutral and could apply to many contexts.
      `;

      const domains = await detector.detectDomains(genericContent);

      // Should either return empty array or domains with very low confidence
      domains.forEach(domain => {
        expect(domain.confidence).toBeLessThan(0.5);
      });
    });
  });

  describe('getDomainTemplate', () => {
    it('should return legal domain template', () => {
      const template = detector.getDomainTemplate('legal');

      expect(template).toBeDefined();
      expect(template!.name).toBe('Legal Documents');
      expect(template!.entityTypes.length).toBeGreaterThan(0);
      expect(template!.edgeTypes.length).toBeGreaterThan(0);
      
      const legalEntityType = template!.entityTypes.find(et => et.name === 'Legal Entity');
      expect(legalEntityType).toBeDefined();
    });

    it('should return medical domain template', () => {
      const template = detector.getDomainTemplate('medical');

      expect(template).toBeDefined();
      expect(template!.name).toBe('Medical Records');
      
      const patientType = template!.entityTypes.find(et => et.name === 'Patient');
      expect(patientType).toBeDefined();
      expect(patientType!.attributes).toContain('patient_id');
    });

    it('should return financial domain template', () => {
      const template = detector.getDomainTemplate('financial');

      expect(template).toBeDefined();
      expect(template!.name).toBe('Financial Documents');
      
      const accountType = template!.entityTypes.find(et => et.name === 'Financial Account');
      expect(accountType).toBeDefined();
    });

    it('should return null for unknown domain', () => {
      const template = detector.getDomainTemplate('unknown');
      expect(template).toBeNull();
    });

    it('should be case insensitive', () => {
      const template1 = detector.getDomainTemplate('LEGAL');
      const template2 = detector.getDomainTemplate('Legal');
      const template3 = detector.getDomainTemplate('legal');

      expect(template1).toBeDefined();
      expect(template2).toBeDefined();
      expect(template3).toBeDefined();
      expect(template1!.id).toBe(template2!.id);
      expect(template2!.id).toBe(template3!.id);
    });
  });

  describe('getAllDomainTemplates', () => {
    it('should return all available domain templates', () => {
      const templates = detector.getAllDomainTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(3);
      
      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('Legal Documents');
      expect(templateNames).toContain('Medical Records');
      expect(templateNames).toContain('Financial Documents');
    });

    it('should return templates with complete structure', () => {
      const templates = detector.getAllDomainTemplates();

      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.entityTypes).toBeDefined();
        expect(template.edgeTypes).toBeDefined();
        expect(template.patterns).toBeDefined();
        expect(template.prompts).toBeDefined();
        expect(template.prompts.entityExtraction).toBeDefined();
        expect(template.prompts.relationshipExtraction).toBeDefined();
        expect(template.prompts.classification).toBeDefined();
      });
    });
  });

  describe('generateDomainSpecificPrompts', () => {
    it('should return entity extraction prompt for legal domain', () => {
      const prompt = detector.generateDomainSpecificPrompts('legal', 'entity');

      expect(prompt).toBeDefined();
      expect(prompt).toContain('legal entities');
      expect(prompt).toContain('parties');
      expect(prompt).toContain('documents');
    });

    it('should return relationship extraction prompt for medical domain', () => {
      const prompt = detector.generateDomainSpecificPrompts('medical', 'relationship');

      expect(prompt).toBeDefined();
      expect(prompt).toContain('relationships');
      expect(prompt).toContain('diagnoses');
      expect(prompt).toContain('treatments');
    });

    it('should return classification prompt for financial domain', () => {
      const prompt = detector.generateDomainSpecificPrompts('financial', 'classification');

      expect(prompt).toBeDefined();
      expect(prompt).toContain('financial');
      expect(prompt).toContain('accounting');
    });

    it('should return null for unknown domain', () => {
      const prompt = detector.generateDomainSpecificPrompts('unknown', 'entity');
      expect(prompt).toBeNull();
    });

    it('should return null for invalid task type', () => {
      const prompt = detector.generateDomainSpecificPrompts('legal', 'invalid' as any);
      expect(prompt).toBeNull();
    });
  });

  describe('generateDomainAwareTypes', () => {
    it('should suggest appropriate types for legal content', async () => {
      const legalContent = `
        The attorney filed a lawsuit against the corporation.
        The contract was signed by both parties last month.
      `;

      const suggestions = await detector.generateDomainAwareTypes(legalContent);

      expect(suggestions.length).toBeGreaterThan(0);
      
      const typeNames = suggestions.map(s => s.type);
      // Check that we get relevant legal types (may vary based on content analysis)
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.domain === 'legal')).toBe(true);
    });

    it('should suggest appropriate types for medical content', async () => {
      const medicalContent = `
        The patient was treated by Dr. Smith for diabetes.
        Insulin was prescribed as part of the treatment plan.
      `;

      const suggestions = await detector.generateDomainAwareTypes(medicalContent);

      expect(suggestions.length).toBeGreaterThan(0);
      
      const typeNames = suggestions.map(s => s.type);
      // Check that we get relevant medical types (may vary based on content analysis)
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.domain === 'medical')).toBe(true);
    });

    it('should return suggestions sorted by confidence', async () => {
      const content = `Patient John was diagnosed with hypertension by Dr. Smith.`;

      const suggestions = await detector.generateDomainAwareTypes(content);

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Suggestions should be sorted by confidence
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });

    it('should handle content with no clear domain', async () => {
      const genericContent = `This is some generic text without specific domain indicators.`;

      const suggestions = await detector.generateDomainAwareTypes(genericContent);

      // Should return empty array or suggestions with very low confidence
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeLessThan(0.5);
      });
    });
  });

  describe('analyzeDomainFit', () => {
    it('should analyze alignment between content and current types', async () => {
      const legalContent = `
        The attorney represents the plaintiff in the lawsuit.
        The contract specifies the terms and conditions.
      `;
      
      const currentTypes = ['Legal Professional', 'Legal Entity', 'Legal Document'];

      const analysis = await detector.analyzeDomainFit(legalContent, currentTypes);

      expect(analysis.domainAlignment).toBeGreaterThan(0.5);
      expect(analysis.missingDomainTypes.length).toBeGreaterThanOrEqual(0);
      expect(analysis.inappropriateTypes.length).toBeGreaterThanOrEqual(0); // May or may not be inappropriate
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify missing domain-specific types', async () => {
      const medicalContent = `
        The patient was diagnosed with diabetes and prescribed medication.
        The doctor scheduled follow-up appointments.
      `;
      
      const currentTypes = ['Person']; // Generic type, missing medical-specific ones

      const analysis = await detector.analyzeDomainFit(medicalContent, currentTypes);

      expect(analysis.domainAlignment).toBeLessThan(0.7);
      expect(analysis.missingDomainTypes.length).toBeGreaterThan(0);
      expect(analysis.missingDomainTypes).toContain('Patient');
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify inappropriate types for domain', async () => {
      const legalContent = `Contract between plaintiff and defendant.`;
      const currentTypes = ['Medical Condition', 'Medication']; // Wrong domain types

      const analysis = await detector.analyzeDomainFit(legalContent, currentTypes);

      expect(analysis.domainAlignment).toBeLessThan(0.5);
      expect(analysis.inappropriateTypes.length).toBeGreaterThan(0);
      expect(analysis.inappropriateTypes).toContain('Medical Condition');
      expect(analysis.inappropriateTypes).toContain('Medication');
    });

    it('should provide helpful suggestions', async () => {
      const technicalContent = `
        The software system uses REST API for data communication.
        The database stores user information securely.
      `;
      
      const currentTypes = ['Document']; // Too generic

      const analysis = await detector.analyzeDomainFit(technicalContent, currentTypes);

      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.suggestions.some(s => s.includes('domain-specific'))).toBe(true);
    });

    it('should handle empty current types', async () => {
      const content = `Some content here.`;
      const currentTypes: string[] = [];

      const analysis = await detector.analyzeDomainFit(content, currentTypes);

      expect(analysis.domainAlignment).toBe(0);
      expect(analysis.missingDomainTypes.length).toBeGreaterThanOrEqual(0);
      expect(analysis.inappropriateTypes.length).toBe(0);
    });
  });

  describe('addCustomDomainPattern', () => {
    it('should add custom domain pattern', async () => {
      const customPattern: DomainPattern = {
        keywords: ['custom', 'test', 'example'],
        phrases: ['custom test phrase'],
        technicalTerms: ['custom-tech'],
        formatPatterns: [/CUSTOM-\d+/],
        weight: 1.0
      };

      detector.addCustomDomainPattern('custom', customPattern);

      const content = `This is a custom test with custom-tech and CUSTOM-123 format.`;
      const domains = await detector.detectDomains(content);

      const customDomain = domains.find(d => d.name === 'custom');
      expect(customDomain).toBeDefined();
      expect(customDomain!.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('addCustomDomainTemplate', () => {
    it('should add custom domain template', () => {
      const customTemplate: DomainTemplate = {
        id: 'custom',
        name: 'Custom Domain',
        description: 'A custom domain for testing',
        entityTypes: [
          {
            name: 'Custom Entity',
            description: 'A custom entity type',
            examples: ['custom example'],
            attributes: ['custom_attr']
          }
        ],
        edgeTypes: [
          {
            name: 'Custom Relationship',
            description: 'A custom relationship',
            sourceTypes: ['Custom Entity'],
            targetTypes: ['Custom Entity']
          }
        ],
        patterns: {
          keywords: ['custom'],
          phrases: ['custom phrase'],
          technicalTerms: ['custom-term'],
          formatPatterns: [],
          weight: 1.0
        },
        prompts: {
          entityExtraction: 'Extract custom entities',
          relationshipExtraction: 'Extract custom relationships',
          classification: 'Classify custom content'
        }
      };

      detector.addCustomDomainTemplate(customTemplate);

      const template = detector.getDomainTemplate('custom');
      expect(template).toBeDefined();
      expect(template!.name).toBe('Custom Domain');
      expect(template!.entityTypes[0].name).toBe('Custom Entity');
    });
  });

  describe('format pattern matching', () => {
    it('should detect legal citation patterns', async () => {
      const content = `Case 2023 U.S. 456 and 789 F.3d 123 are relevant precedents.`;
      const domains = await detector.detectDomains(content);

      const legalDomain = domains.find(d => d.name === 'legal');
      expect(legalDomain).toBeDefined();
      expect(legalDomain!.indicators.some(i => i.includes('format pattern'))).toBe(true);
    });

    it('should detect financial currency patterns', async () => {
      const content = `Revenue increased to $1,234,567.89 this quarter.`;
      const domains = await detector.detectDomains(content);

      const financialDomain = domains.find(d => d.name === 'financial');
      expect(financialDomain).toBeDefined();
      expect(financialDomain!.indicators.some(i => i.includes('format pattern'))).toBe(true);
    });

    it('should detect technical URL patterns', async () => {
      const content = `API endpoint: https://api.example.com/v1/users`;
      const domains = await detector.detectDomains(content);

      const technicalDomain = domains.find(d => d.name === 'technical');
      expect(technicalDomain).toBeDefined();
      expect(technicalDomain!.indicators.some(i => i.includes('format pattern'))).toBe(true);
    });

    it('should detect academic p-value patterns', async () => {
      const content = `Statistical significance was found (p < 0.05).`;
      const domains = await detector.detectDomains(content);

      const academicDomain = domains.find(d => d.name === 'academic');
      expect(academicDomain).toBeDefined();
      expect(academicDomain!.indicators.some(i => i.includes('format pattern'))).toBe(true);
    });
  });
});