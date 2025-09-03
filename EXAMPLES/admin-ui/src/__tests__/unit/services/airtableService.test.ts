// Mock Airtable before importing the service
jest.mock('airtable');

import { airtableService } from '../../../services/airtableService';

// Setup mock functions
const mockAll = jest.fn(() => Promise.resolve([]));
const mockSelect = jest.fn(() => ({
  all: mockAll,
}));
const mockCreate = jest.fn(() => Promise.resolve({ id: 'test-id', get: jest.fn() }));
const mockUpdate = jest.fn(() => Promise.resolve({ id: 'test-id', get: jest.fn() }));
const mockDestroy = jest.fn(() => Promise.resolve());

const mockTable = jest.fn(() => ({
  select: mockSelect,
  create: mockCreate,
  update: mockUpdate,
  destroy: mockDestroy,
}));

const mockBase = jest.fn(() => mockTable);

// Configure the mock
const Airtable = require('airtable');
Airtable.mockImplementation(() => ({
  base: mockBase,
}));

describe('AirtableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOntologies', () => {
    it('should fetch ontologies from Airtable', async () => {
      const mockOntologies = [
        {
          id: 'rec1',
          get: jest.fn((field) => {
            const data: Record<string, any> = {
              'Ontology Name': 'Test Ontology',
              'Domain': 'Healthcare',
              'Version': '1.0',
              'Status': 'Published',
              'Created Date': '2024-01-01',
              'Entity Count': 5,
              'Edge Count': 3,
            };
            return data[field];
          }),
        },
      ];

      mockAll.mockResolvedValue(mockOntologies);

      const result = await airtableService.getOntologies();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'rec1',
        name: 'Test Ontology',
        domain: 'Healthcare',
        version: '1.0',
        status: 'Published',
        createdDate: '2024-01-01',
        entityCount: 5,
        edgeCount: 3,
      });
    });

    it('should handle empty results', async () => {
      mockAll.mockResolvedValue([]);

      const result = await airtableService.getOntologies();

      expect(result).toEqual([]);
    });
  });

  describe('createOntology', () => {
    it('should create a new ontology', async () => {
      // Mock is already set up
      
      const mockRecord = {
        id: 'rec123',
        get: jest.fn((field) => {
          const data: Record<string, any> = {
            'Ontology Name': 'New Ontology',
            'Domain': 'Finance',
            'Version': '1.0',
            'Status': 'Draft',
          };
          return data[field];
        }),
      };
      
      mockCreate.mockResolvedValue(mockRecord);

      const result = await airtableService.createOntology({
        name: 'New Ontology',
        domain: 'Finance',
        version: '1.0',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        'Ontology Name': 'New Ontology',
        Domain: 'Finance',
        Version: '1.0',
        Status: 'Draft',
        'Created Date': expect.any(String),
      });

      expect(result).toEqual({
        id: 'rec123',
        name: 'New Ontology',
        domain: 'Finance',
        version: '1.0',
        status: 'Draft',
      });
    });
  });

  describe('getFactRatingConfigs', () => {
    it('should fetch fact rating configurations', async () => {
      const mockConfigs = [
        {
          id: 'rec1',
          get: jest.fn((field) => {
            const data: Record<string, any> = {
              'Config Name': 'Clinical Relevance',
              'Ontology': ['ontology123'],
              'Rating Instruction': 'Rate by medical significance',
              'High Example': 'Critical diagnosis',
              'Medium Example': 'Routine checkup',
              'Low Example': 'Administrative note',
              'Effectiveness Score': 0.85,
              'Status': 'Active',
            };
            return data[field];
          }),
        },
      ];

      // Mock is already set up
      
      mockAll.mockResolvedValue(mockConfigs);

      const result = await airtableService.getFactRatingConfigs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'rec1',
        name: 'Clinical Relevance',
        ontologyId: 'ontology123',
        instruction: 'Rate by medical significance',
        highExample: 'Critical diagnosis',
        mediumExample: 'Routine checkup',
        lowExample: 'Administrative note',
        effectivenessScore: 0.85,
        status: 'Active',
      });
    });
  });

  describe('updateOntology', () => {
    it('should update an existing ontology', async () => {
      // Mock is already set up
      
      const mockRecord = {
        id: 'rec123',
        get: jest.fn((field) => {
          const data: Record<string, any> = {
            'Ontology Name': 'Updated Ontology',
            'Status': 'Published',
          };
          return data[field];
        }),
      };
      
      mockUpdate.mockResolvedValue(mockRecord);

      const result = await airtableService.updateOntology('rec123', {
        name: 'Updated Ontology',
        status: 'Published',
      });

      expect(mockUpdate).toHaveBeenCalledWith('rec123', {
        'Ontology Name': 'Updated Ontology',
        Status: 'Published',
      });

      expect(result).toEqual({
        id: 'rec123',
        name: 'Updated Ontology',
        status: 'Published',
      });
    });
  });
});