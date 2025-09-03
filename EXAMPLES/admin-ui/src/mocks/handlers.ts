import { http, HttpResponse } from 'msw';

// Mock data
const mockOntologies = [
  {
    id: 'ont1',
    name: 'Healthcare Ontology',
    domain: 'Healthcare',
    version: '1.0',
    status: 'Published',
    createdDate: '2024-01-01',
    entityCount: 15,
    edgeCount: 8,
  },
  {
    id: 'ont2',
    name: 'Finance Ontology',
    domain: 'Finance',
    version: '2.0',
    status: 'Testing',
    createdDate: '2024-01-15',
    entityCount: 12,
    edgeCount: 6,
  },
];

const mockConfigs = [
  {
    id: 'conf1',
    name: 'Medical Relevance',
    ontologyId: 'ont1',
    instruction: 'Rate based on medical significance',
    highExample: 'Critical diagnosis',
    mediumExample: 'Routine checkup',
    lowExample: 'Administrative note',
    effectivenessScore: 0.88,
    status: 'Active',
  },
];

const mockTestRuns = [
  {
    id: 'test1',
    name: 'Healthcare Test Run',
    ontologyId: 'ont1',
    datasetId: 'dataset1',
    graphId: 'graph1',
    runDate: '2024-02-01',
    status: 'Completed',
    precision: 0.92,
    recall: 0.88,
    f1Score: 0.90,
    duration: 180,
    notes: 'Successful test run',
  },
  {
    id: 'test2',
    name: 'Finance Test Run',
    ontologyId: 'ont2',
    datasetId: 'dataset2',
    graphId: 'graph2',
    runDate: '2024-02-02',
    status: 'Running',
    precision: null,
    recall: null,
    f1Score: null,
    duration: null,
    notes: 'In progress',
  },
];

const mockAssignments = [
  {
    id: 'assign1',
    name: 'Healthcare Assignment',
    ontologyId: 'ont1',
    targetType: 'Graph',
    targetId: 'graph1',
    assignedBy: 'admin@example.com',
    assignedDate: '2024-01-20',
    active: true,
  },
];

// Define handlers for MSW
export const handlers = [
  // Ontologies endpoints
  http.get('/api/ontologies', () => {
    return HttpResponse.json(mockOntologies);
  }),

  http.post('/api/ontologies', async ({ request }) => {
    const body = await request.json() as any;
    const newOntology = {
      id: `ont${Date.now()}`,
      ...body,
      status: 'Draft',
      createdDate: new Date().toISOString(),
      entityCount: 0,
      edgeCount: 0,
    };
    mockOntologies.push(newOntology);
    return HttpResponse.json(newOntology, { status: 201 });
  }),

  http.put('/api/ontologies/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const index = mockOntologies.findIndex(o => o.id === id);
    if (index !== -1) {
      mockOntologies[index] = { ...mockOntologies[index], ...body };
      return HttpResponse.json(mockOntologies[index]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/ontologies/:id', ({ params }) => {
    const { id } = params;
    const index = mockOntologies.findIndex(o => o.id === id);
    if (index !== -1) {
      mockOntologies.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Fact Rating Configs endpoints
  http.get('/api/fact-rating-configs', () => {
    return HttpResponse.json(mockConfigs);
  }),

  http.post('/api/fact-rating-configs', async ({ request }) => {
    const body = await request.json() as any;
    const newConfig = {
      id: `conf${Date.now()}`,
      ...body,
      effectivenessScore: 0,
      status: 'Draft',
    };
    mockConfigs.push(newConfig);
    return HttpResponse.json(newConfig, { status: 201 });
  }),

  // Test Runs endpoints
  http.get('/api/test-runs', () => {
    return HttpResponse.json(mockTestRuns);
  }),

  http.post('/api/test-runs', async ({ request }) => {
    const body = await request.json() as any;
    const newTestRun = {
      id: `test${Date.now()}`,
      ...body,
      runDate: new Date().toISOString(),
      status: 'Running',
      precision: null,
      recall: null,
      f1Score: null,
      duration: null,
    };
    mockTestRuns.push(newTestRun);
    return HttpResponse.json(newTestRun, { status: 201 });
  }),

  // Assignments endpoints
  http.get('/api/assignments', () => {
    return HttpResponse.json(mockAssignments);
  }),

  http.post('/api/assignments', async ({ request }) => {
    const body = await request.json() as any;
    const newAssignment = {
      id: `assign${Date.now()}`,
      ...body,
      assignedDate: new Date().toISOString(),
      active: true,
    };
    mockAssignments.push(newAssignment);
    return HttpResponse.json(newAssignment, { status: 201 });
  }),

  // Test execution endpoint
  http.post('/api/tests/run', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      testId: `test${Date.now()}`,
      status: 'Started',
      message: 'Test execution started',
      ...body,
    });
  }),

  // Import preview endpoint
  http.post('/api/imports/preview', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    return HttpResponse.json({
      preview: {
        fileName: file instanceof File ? file.name : 'unknown',
        size: file instanceof File ? file.size : 0,
        estimatedEntities: 10,
        estimatedEdges: 5,
        processingTime: '~30 seconds',
      },
    });
  }),

  // Import execution endpoint
  http.post('/api/imports/execute', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    return HttpResponse.json({
      importId: `import${Date.now()}`,
      status: 'Processing',
      fileName: file instanceof File ? file.name : 'unknown',
      message: 'Import started successfully',
    }, { status: 202 });
  }),
];