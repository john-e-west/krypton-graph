import { Node, Edge } from 'reactflow';
import {
  exportOntology,
  downloadJSON,
  validateImportData,
  convertImportToReactFlow,
  generateExportFilename,
  importOntologyFile,
  OntologyExportData,
} from '../../../utils/ontologyImportExport';

// Mock DOM APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockOntologyMetadata = {
  name: 'Test Ontology',
  domain: 'Testing',
  description: 'A test ontology',
  version: '1.0.0',
  tags: ['test', 'example'],
};

const mockNodes: Node[] = [
  {
    id: 'node-1',
    type: 'entity',
    position: { x: 100, y: 100 },
    data: {
      label: 'Person',
      type: 'Person',
      description: 'A person entity',
      properties: {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
      },
    },
  },
  {
    id: 'node-2',
    type: 'entity',
    position: { x: 300, y: 200 },
    data: {
      label: 'Organization',
      type: 'Organization',
      description: 'An organization entity',
      properties: {
        name: { type: 'string', required: true },
      },
    },
  },
];

const mockEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'smoothstep',
    data: {
      label: 'Works For',
      cardinality: 'many-to-one',
      description: 'Employment relationship',
    },
  },
];

describe('ontologyImportExport', () => {
  describe('exportOntology', () => {
    it('exports basic ontology data', () => {
      const result = exportOntology(mockOntologyMetadata, mockNodes, mockEdges);

      expect(result.version).toBe('1.0.0');
      expect(result.metadata.name).toBe('Test Ontology');
      expect(result.metadata.domain).toBe('Testing');
      expect(result.entities).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
    });

    it('includes layout information by default', () => {
      const result = exportOntology(mockOntologyMetadata, mockNodes, mockEdges);

      expect(result.layout).toBeDefined();
      expect(result.layout?.algorithm).toBe('manual');
      expect(result.entities[0].position).toEqual({ x: 100, y: 100 });
    });

    it('excludes layout when option is false', () => {
      const result = exportOntology(
        mockOntologyMetadata,
        mockNodes,
        mockEdges,
        { includeLayout: false }
      );

      expect(result.layout).toBeUndefined();
      expect(result.entities[0].position).toBeUndefined();
    });

    it('includes validation when requested', () => {
      const result = exportOntology(
        mockOntologyMetadata,
        mockNodes,
        mockEdges,
        { includeValidation: true }
      );

      expect(result.validation).toBeDefined();
      expect(result.validation?.errors).toEqual([]);
      expect(result.validation?.warnings).toEqual([]);
    });

    it('properly converts node data to entity format', () => {
      const result = exportOntology(mockOntologyMetadata, mockNodes, mockEdges);

      const person = result.entities[0];
      expect(person.id).toBe('node-1');
      expect(person.name).toBe('Person');
      expect(person.type).toBe('Person');
      expect(person.description).toBe('A person entity');
      expect(person.properties).toEqual({
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
      });
    });

    it('properly converts edge data to relationship format', () => {
      const result = exportOntology(mockOntologyMetadata, mockNodes, mockEdges);

      const relationship = result.relationships[0];
      expect(relationship.id).toBe('edge-1');
      expect(relationship.sourceId).toBe('node-1');
      expect(relationship.targetId).toBe('node-2');
      expect(relationship.cardinality).toBe('many-to-one');
    });
  });

  describe('downloadJSON', () => {
    beforeEach(() => {
      // Mock DOM manipulation
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      document.createElement = jest.fn().mockReturnValue({
        href: '',
        download: '',
        click: jest.fn(),
      });
    });

    it('creates download link with correct filename', () => {
      const testData = { test: 'data' };
      downloadJSON(testData, 'test-file');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('adds .json extension if not present', () => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      document.createElement = jest.fn().mockReturnValue(mockLink);

      downloadJSON({ test: 'data' }, 'test-file');

      expect(mockLink.download).toBe('test-file.json');
    });

    it('does not duplicate .json extension', () => {
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      document.createElement = jest.fn().mockReturnValue(mockLink);

      downloadJSON({ test: 'data' }, 'test-file.json');

      expect(mockLink.download).toBe('test-file.json');
    });
  });

  describe('validateImportData', () => {
    const validData = {
      version: '1.0.0',
      metadata: {
        name: 'Test Ontology',
        domain: 'Testing',
      },
      entities: [
        { id: 'e1', name: 'Entity 1', type: 'Type1' },
      ],
      relationships: [
        { id: 'r1', sourceId: 'e1', targetId: 'e1', name: 'Self Ref' },
      ],
    };

    it('validates correct data structure', () => {
      const result = validateImportData(validData);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.entitiesCount).toBe(1);
      expect(result.summary.relationshipsCount).toBe(1);
    });

    it('detects missing version', () => {
      const invalidData = { ...validData };
      delete invalidData.version;

      const result = validateImportData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing version field');
    });

    it('detects missing metadata', () => {
      const invalidData = { ...validData };
      delete invalidData.metadata;

      const result = validateImportData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing metadata field');
    });

    it('validates entity structure', () => {
      const invalidData = {
        ...validData,
        entities: [{ name: 'Entity 1' }], // Missing ID
      };

      const result = validateImportData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Entity at index 0 is missing an ID');
    });

    it('validates relationship references', () => {
      const invalidData = {
        ...validData,
        relationships: [
          { id: 'r1', sourceId: 'nonexistent', targetId: 'e1', name: 'Invalid' },
        ],
      };

      const result = validateImportData(invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Relationship "Invalid" references non-existent source entity: nonexistent'
      );
    });

    it('handles missing relationships gracefully', () => {
      const dataWithoutRelationships = { ...validData };
      delete dataWithoutRelationships.relationships;

      const result = validateImportData(dataWithoutRelationships);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No relationships defined');
      expect(result.data?.relationships).toEqual([]);
    });
  });

  describe('convertImportToReactFlow', () => {
    const importData: OntologyExportData = {
      version: '1.0.0',
      metadata: {
        name: 'Test',
        domain: 'Testing',
        exportedAt: Date.now(),
      },
      entities: [
        {
          id: 'e1',
          name: 'Entity 1',
          type: 'Type1',
          properties: { prop1: 'value1' },
          position: { x: 100, y: 200 },
        },
      ],
      relationships: [
        {
          id: 'r1',
          name: 'Relation 1',
          sourceId: 'e1',
          targetId: 'e1',
          type: 'default',
          cardinality: 'one-to-one',
          bidirectional: true,
        },
      ],
    };

    it('converts entities to ReactFlow nodes', () => {
      const result = convertImportToReactFlow(importData);

      expect(result.nodes).toHaveLength(1);
      const node = result.nodes[0];
      expect(node.id).toBe('e1');
      expect(node.type).toBe('entity');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.data.label).toBe('Entity 1');
      expect(node.data.type).toBe('Type1');
    });

    it('converts relationships to ReactFlow edges', () => {
      const result = convertImportToReactFlow(importData);

      expect(result.edges).toHaveLength(1);
      const edge = result.edges[0];
      expect(edge.id).toBe('r1');
      expect(edge.source).toBe('e1');
      expect(edge.target).toBe('e1');
      expect(edge.data.cardinality).toBe('one-to-one');
      expect(edge.data.bidirectional).toBe(true);
    });

    it('generates default positions for entities without position', () => {
      const dataWithoutPosition = {
        ...importData,
        entities: [
          { ...importData.entities[0], position: undefined },
          { id: 'e2', name: 'Entity 2', type: 'Type2', properties: {} },
        ],
      };

      const result = convertImportToReactFlow(dataWithoutPosition);

      expect(result.nodes[0].position).toEqual({ x: 100, y: 100 });
      expect(result.nodes[1].position).toEqual({ x: 300, y: 100 });
    });
  });

  describe('generateExportFilename', () => {
    it('generates filename with sanitized name and date', () => {
      const result = generateExportFilename('My Test Ontology!');

      expect(result).toMatch(/^my_test_ontology_\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('handles different formats', () => {
      const yamlResult = generateExportFilename('Test', 'yaml');
      const pngResult = generateExportFilename('Test', 'png');

      expect(yamlResult).toMatch(/\.yaml$/);
      expect(pngResult).toMatch(/\.png$/);
    });

    it('sanitizes special characters', () => {
      const result = generateExportFilename('Test@#$%^&*()Ontology');

      expect(result).toMatch(/^test_ontology_\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('importOntologyFile', () => {
    it('successfully imports valid JSON file', async () => {
      const validJson = JSON.stringify({
        version: '1.0.0',
        metadata: { name: 'Test', domain: 'Testing' },
        entities: [],
        relationships: [],
      });

      const file = new File([validJson], 'test.json', { type: 'application/json' });
      const result = await importOntologyFile(file);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('handles invalid JSON gracefully', async () => {
      const invalidJson = 'invalid json content';
      const file = new File([invalidJson], 'test.json', { type: 'application/json' });

      const result = await importOntologyFile(file);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to parse file');
    });

    it('rejects unsupported file formats', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = await importOntologyFile(file);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unsupported file format. Please use JSON or YAML.');
    });

    it('handles YAML files with appropriate message', async () => {
      const file = new File(['key: value'], 'test.yaml', { type: 'application/x-yaml' });

      const result = await importOntologyFile(file);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('YAML import not yet implemented. Please use JSON format.');
    });
  });
});