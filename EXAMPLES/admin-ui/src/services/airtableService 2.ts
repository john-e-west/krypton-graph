import Airtable from 'airtable';

const BASE_ID = process.env.REACT_APP_AIRTABLE_BASE_ID || 'appvLsaMZqtLc9EIX';
const API_KEY = process.env.REACT_APP_AIRTABLE_API_KEY || '';

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

export const airtableService = {
  // Ontology operations
  async getOntologies() {
    const records = await base('Ontologies').select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('Name'),
      domain: record.get('Domain'),
      version: record.get('Version'),
      status: record.get('Status'),
      createdDate: record.get('Created Date'),
      notes: record.get('Notes') || '',
      entityCount: record.get('Entity Count'),
      edgeCount: record.get('Edge Count'),
    }));
  },

  async createOntology(data: any) {
    const record = await base('Ontologies').create({
      Name: data.name,
      Domain: data.domain,
      Version: data.version,
      Status: 'Draft',
      'Created Date': new Date().toISOString(),
      Notes: data.notes,
    });
    return record.id;
  },

  async updateOntology(id: string, data: any) {
    await base('Ontologies').update(id, data);
  },

  async cloneOntology(sourceId: string) {
    const source = await base('Ontologies').find(sourceId);
    const newRecord = await base('Ontologies').create({
      Name: `${source.get('Name')} (Copy)`,
      Domain: source.get('Domain'),
      Version: `${source.get('Version')}.1`,
      Status: 'Draft',
      'Created Date': new Date().toISOString(),
      Notes: `Cloned from ${source.get('Name')}`,
    });
    return newRecord.id;
  },

  // Entity operations
  async getEntities(ontologyId: string) {
    const records = await base('EntityDefinitions')
      .select({
        filterByFormula: `FIND('${ontologyId}', {Ontology})`,
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      name: record.get('Entity Name'),
      entityClass: record.get('Entity Class'),
      properties: JSON.parse((record.get('Properties JSON') as string) || '{}'),
      validationRules: JSON.parse((record.get('Validation Rules') as string) || '{}'),
      examples: record.get('Examples'),
      priority: record.get('Priority'),
      description: record.get('Description'),
    }));
  },

  async createEntity(ontologyId: string, data: any) {
    const record = await base('EntityDefinitions').create({
      'Entity Name': data.name,
      Ontology: [ontologyId],
      'Entity Class': data.entityClass,
      'Properties JSON': JSON.stringify(data.properties),
      'Validation Rules': JSON.stringify(data.validationRules),
      Examples: data.examples,
      Priority: data.priority,
      Description: data.description,
    });
    return record.id;
  },

  // Edge operations
  async getEdges(ontologyId: string) {
    const records = await base('EdgeDefinitions')
      .select({
        filterByFormula: `FIND('${ontologyId}', {Ontology})`,
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      name: record.get('Edge Name'),
      edgeClass: record.get('Edge Class'),
      sourceEntity: record.get('Source Entity'),
      targetEntity: record.get('Target Entity'),
      properties: JSON.parse((record.get('Properties JSON') as string) || '{}'),
      cardinality: record.get('Cardinality'),
      bidirectional: record.get('Bidirectional'),
      description: record.get('Description'),
    }));
  },

  // Fact Rating operations
  async getFactRatingConfigs() {
    const records = await base('FactRatingConfigs').select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('Config Name'),
      ontologyId: (record.get('Ontology') as string[])?.[0],
      instruction: record.get('Rating Instruction'),
      highExample: record.get('High Example'),
      mediumExample: record.get('Medium Example'),
      lowExample: record.get('Low Example'),
      domainContext: record.get('Domain Context'),
      status: record.get('Status'),
      defaultMinRating: record.get('Default Min Rating'),
      effectivenessScore: record.get('Effectiveness Score'),
    }));
  },

  async createFactRatingConfig(data: any) {
    const record = await base('FactRatingConfigs').create({
      'Config Name': data.name,
      Ontology: data.ontologyId ? [data.ontologyId] : undefined,
      'Rating Instruction': data.instruction,
      'High Example': data.highExample,
      'Medium Example': data.mediumExample,
      'Low Example': data.lowExample,
      'Domain Context': data.domainContext,
      Status: 'Draft',
      'Default Min Rating': data.defaultMinRating || 0.3,
      'Created Date': new Date().toISOString(),
    });
    return record.id;
  },

  async updateFactRatingConfig(id: string, data: any) {
    await base('FactRatingConfigs').update(id, data);
  },

  // Test operations
  async getTestRuns(configId?: string) {
    let filterFormula = '';
    if (configId) {
      filterFormula = `FIND('${configId}', {Configuration})`;
    }
    
    const records = await base('TestRuns')
      .select({
        // filterFormula,
        sort: [{ field: 'Run Date', direction: 'desc' }],
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      name: record.get('Run Name'),
      ontologyId: (record.get('Ontology') as string[])?.[0],
      datasetId: (record.get('Test Dataset') as string[])?.[0],
      graphId: record.get('Graph ID'),
      runDate: record.get('Run Date'),
      status: record.get('Status'),
      entitiesExtracted: record.get('Entities Extracted'),
      edgesExtracted: record.get('Edges Extracted'),
      precision: record.get('Precision'),
      recall: record.get('Recall'),
      f1Score: record.get('F1 Score'),
      notes: record.get('Notes'),
    }));
  },

  async createTestRun(data: any) {
    const record = await base('TestRuns').create({
      'Run Name': data.name,
      Ontology: data.ontologyId ? [data.ontologyId] : undefined,
      'Test Dataset': data.datasetId ? [data.datasetId] : undefined,
      'Graph ID': data.graphId,
      'Run Date': new Date().toISOString(),
      Status: 'Running',
    });
    return record.id;
  },

  async updateTestRun(id: string, data: any) {
    await base('TestRuns').update(id, data);
  },

  // Test Dataset operations
  async getTestDatasets() {
    const records = await base('TestDatasets').select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('Dataset Name'),
      domain: record.get('Domain'),
      contentType: record.get('Content Type'),
      sampleData: record.get('Sample Data'),
      expectedEntities: JSON.parse((record.get('Expected Entities JSON') as string) || '[]'),
      expectedEdges: JSON.parse((record.get('Expected Edges JSON') as string) || '[]'),
      description: record.get('Description'),
      size: record.get('Size'),
    }));
  },

  // Assignment operations
  async getAssignments() {
    const records = await base('GraphAssignments').select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('Assignment Name'),
      ontologyId: (record.get('Ontology') as string[])?.[0],
      targetType: record.get('Target Type'),
      targetId: record.get('Target ID'),
      assignedBy: record.get('Assigned By'),
      assignedDate: record.get('Assigned Date'),
      active: record.get('Active'),
      overrideLevel: record.get('Override Level'),
      notes: record.get('Notes'),
    }));
  },

  async createAssignment(data: any) {
    const record = await base('GraphAssignments').create({
      'Assignment Name': data.name,
      Ontology: data.ontologyId ? [data.ontologyId] : undefined,
      'Target Type': data.targetType,
      'Target ID': data.targetId,
      'Assigned Date': new Date().toISOString(),
      Active: true,
      'Override Level': data.overrideLevel || 'Default',
      Notes: data.notes,
    });
    return record.id;
  },

  async updateAssignment(id: string, data: any) {
    await base('GraphAssignments').update(id, data);
  },

  // Fact Rating Test operations
  async getFactRatingTests(configId?: string) {
    let filterFormula = '';
    if (configId) {
      filterFormula = `FIND('${configId}', {Configuration})`;
    }
    
    const records = await base('FactRatingTests')
      .select({
        // filterFormula,
        sort: [{ field: 'Run Date', direction: 'desc' }],
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      name: record.get('Test Name'),
      configurationId: (record.get('Configuration') as string[])?.[0],
      datasetId: (record.get('Test Dataset') as string[])?.[0],
      sampleFacts: JSON.parse((record.get('Sample Facts JSON') as string) || '[]'),
      expectedRatings: JSON.parse((record.get('Expected Ratings JSON') as string) || '[]'),
      actualRatings: JSON.parse((record.get('Actual Ratings JSON') as string) || '[]'),
      accuracyScore: record.get('Accuracy Score'),
      precision: record.get('Precision'),
      recall: record.get('Recall'),
      runDate: record.get('Run Date'),
      status: record.get('Status'),
      notes: record.get('Notes'),
    }));
  },

  async createFactRatingTest(data: any) {
    const record = await base('FactRatingTests').create({
      'Test Name': data.name,
      Configuration: data.configurationId ? [data.configurationId] : undefined,
      'Test Dataset': data.datasetId ? [data.datasetId] : undefined,
      'Sample Facts JSON': JSON.stringify(data.sampleFacts || []),
      'Run Date': new Date().toISOString(),
      Status: 'Running',
    });
    return record.id;
  },

  async updateFactRatingTest(id: string, data: any) {
    await base('FactRatingTests').update(id, data);
  },
};