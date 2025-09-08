import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ImpactAssessmentEngine,
  Operation,
  OperationType,
  ImpactReport,
  RippleCalculator,
  ConfidenceCalculator,
} from '../impact-assessment';
import { GraphClone } from '../graph-clone';

vi.mock('../graph-clone');

describe('ImpactAssessmentEngine', () => {
  let engine: ImpactAssessmentEngine;
  let mockClone: GraphClone;
  
  beforeEach(() => {
    const createMockGraph = () => ({
      entities: [
        { id: 'entity1', name: 'Entity 1' },
        { id: 'entity2', name: 'Entity 2' },
        { id: 'entity3', name: 'Entity 3' },
      ],
      edges: [
        { id: 'edge1', source: 'entity1', target: 'entity2' },
        { id: 'edge2', source: 'entity2', target: 'entity3' },
      ],
    });
    
    mockClone = {
      getClonedGraph: vi.fn().mockImplementation(createMockGraph),
    } as any;
    
    engine = new ImpactAssessmentEngine(mockClone);
  });

  describe('assessImpact', () => {
    it('should assess impact of entity deletion', async () => {
      const operation: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity1',
      };

      const report = await engine.assessImpact(operation);

      expect(report).toBeDefined();
      expect(report.operation).toEqual(operation);
      expect(report.direct.length).toBeGreaterThan(0);
      expect(report.direct[0].type).toBe('ENTITY_DELETED');
      expect(report.direct[0].elementId).toBe('entity1');
      expect(report.direct[0].severity).toBe('HIGH');
    });

    it('should identify cascade delete impacts for connected edges', async () => {
      const operation: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity2',
      };

      const report = await engine.assessImpact(operation);

      const cascadeDeletes = report.direct.filter(i => i.type === 'EDGE_CASCADE_DELETE');
      expect(cascadeDeletes.length).toBe(2); // entity2 is connected to 2 edges
      expect(cascadeDeletes.every(i => i.severity === 'HIGH')).toBe(true);
    });

    it('should calculate indirect impacts', async () => {
      const operation: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity1',
      };

      const report = await engine.assessImpact(operation);

      expect(report.indirect.length).toBeGreaterThan(0);
      expect(report.indirect[0].type).toBe('RIPPLE_EFFECT');
    });

    it('should generate accurate statistics', async () => {
      const operation: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity2',
      };

      const report = await engine.assessImpact(operation);

      expect(report.statistics.totalAffected).toBeGreaterThan(0);
      expect(report.statistics.byType['ENTITY_DELETED']).toBe(1);
      expect(report.statistics.byType['EDGE_CASCADE_DELETE']).toBe(2);
      expect(report.statistics.percentageOfGraph).toBeGreaterThan(0);
    });

    it('should calculate confidence score', async () => {
      const operation: Operation = {
        type: 'UPDATE_ENTITY',
        entityId: 'entity1',
        data: { name: 'Updated Entity 1' },
      };

      const report = await engine.assessImpact(operation);

      expect(report.confidence).toBeDefined();
      expect(report.confidence.overall).toBeGreaterThan(0);
      expect(report.confidence.overall).toBeLessThanOrEqual(1);
      expect(report.confidence.range.min).toBeLessThanOrEqual(report.confidence.overall);
      expect(report.confidence.range.max).toBeGreaterThanOrEqual(report.confidence.overall);
    });

    it('should handle entity update operations', async () => {
      const operation: Operation = {
        type: 'UPDATE_ENTITY',
        entityId: 'entity1',
        data: { name: 'Modified Entity' },
      };

      const report = await engine.assessImpact(operation);

      const modifiedImpact = report.direct.find(i => i.type === 'ENTITY_MODIFIED');
      expect(modifiedImpact).toBeDefined();
      expect(modifiedImpact?.elementId).toBe('entity1');
      expect(modifiedImpact?.severity).toBe('MEDIUM');
    });

    it('should handle edge deletion operations', async () => {
      const operation: Operation = {
        type: 'DELETE_EDGE',
        edgeId: 'edge1',
      };

      const report = await engine.assessImpact(operation);

      const edgeImpact = report.direct.find(i => i.elementId === 'edge1');
      expect(edgeImpact).toBeDefined();
      expect(edgeImpact?.type).toBe('EDGE_MODIFIED');
    });

    it('should handle entity creation operations', async () => {
      const operation: Operation = {
        type: 'CREATE_ENTITY',
        data: { name: 'New Entity' },
      };

      const report = await engine.assessImpact(operation);

      expect(report).toBeDefined();
      expect(report.operation.type).toBe('CREATE_ENTITY');
    });
  });
});

describe('RippleCalculator', () => {
  let calculator: RippleCalculator;
  let mockClone: GraphClone;

  beforeEach(() => {
    mockClone = {
      getClonedGraph: vi.fn().mockReturnValue({
        entities: [
          { id: 'A' },
          { id: 'B' },
          { id: 'C' },
          { id: 'D' },
        ],
        edges: [
          { id: 'e1', source: 'A', target: 'B' },
          { id: 'e2', source: 'B', target: 'C' },
          { id: 'e3', source: 'C', target: 'D' },
        ],
      }),
    } as any;

    calculator = new RippleCalculator(mockClone);
  });

  describe('calculateRipples', () => {
    it('should calculate ripple effects up to max depth', () => {
      const ripples = calculator.calculateRipples(['A'], 3);

      expect(ripples.size).toBeGreaterThan(0);
      expect(ripples.has(1)).toBe(true); // Should have depth 1 ripples
      
      const depth1 = ripples.get(1);
      expect(depth1).toBeDefined();
      expect(depth1?.some(i => i.elementId === 'B')).toBe(true);
    });

    it('should respect max depth limit', () => {
      const ripples = calculator.calculateRipples(['A'], 2);

      expect(ripples.has(1)).toBe(true);
      expect(ripples.has(2)).toBe(true);
      expect(ripples.has(3)).toBe(false); // Should not exceed max depth
    });

    it('should decrease confidence with depth', () => {
      const ripples = calculator.calculateRipples(['A'], 3);

      const depth1 = ripples.get(1)?.[0];
      const depth2 = ripples.get(2)?.[0];

      if (depth1 && depth2) {
        expect(depth2.confidence).toBeLessThan(depth1.confidence);
      }
    });

    it('should assign appropriate severity based on depth', () => {
      const ripples = calculator.calculateRipples(['A'], 3);

      const depth1 = ripples.get(1)?.[0];
      const depth2 = ripples.get(2)?.[0];
      const depth3 = ripples.get(3)?.[0];

      expect(depth1?.severity).toBe('HIGH');
      expect(depth2?.severity).toBe('MEDIUM');
      expect(depth3?.severity).toBe('LOW');
    });

    it('should handle multiple start nodes', () => {
      const ripples = calculator.calculateRipples(['A', 'C'], 2);

      expect(ripples.size).toBeGreaterThan(0);
      
      const allImpacts = Array.from(ripples.values()).flat();
      expect(allImpacts.some(i => i.cause === 'A')).toBe(true);
      expect(allImpacts.some(i => i.cause === 'C')).toBe(true);
    });
  });
});

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;
  let mockClone: GraphClone;

  beforeEach(() => {
    mockClone = {
      getClonedGraph: vi.fn().mockReturnValue({
        entities: Array(10).fill(null).map((_, i) => ({ id: `entity${i}` })),
        edges: Array(15).fill(null).map((_, i) => ({
          id: `edge${i}`,
          source: `entity${i % 10}`,
          target: `entity${(i + 1) % 10}`,
        })),
      }),
    } as any;

    calculator = new ConfidenceCalculator(mockClone);
  });

  describe('calculate', () => {
    it('should calculate confidence score for operations', () => {
      const operation: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity1',
      };

      const stats = {
        totalAffected: 5,
        byType: {},
        bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 2, CRITICAL: 0 },
        maxDepth: 2,
        percentageOfGraph: 20,
        criticalPaths: [],
      };

      const confidence = calculator.calculate(operation, stats);

      expect(confidence.overall).toBeGreaterThan(0);
      expect(confidence.overall).toBeLessThanOrEqual(1);
      expect(confidence.factors.complexity).toBeDefined();
      expect(confidence.factors.spread).toBeDefined();
      expect(confidence.factors.density).toBeDefined();
    });

    it('should reduce confidence for complex operations', () => {
      const deleteOp: Operation = {
        type: 'DELETE_ENTITY',
        entityId: 'entity1',
      };

      const createOp: Operation = {
        type: 'CREATE_ENTITY',
        data: { name: 'New' },
      };

      const deleteStats = {
        totalAffected: 5,
        byType: {},
        bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 2, CRITICAL: 0 },
        maxDepth: 2,
        percentageOfGraph: 20,
        criticalPaths: [],
      };

      const createStats = { ...deleteStats };

      const deleteConfidence = calculator.calculate(deleteOp, deleteStats);
      const createConfidence = calculator.calculate(createOp, createStats);

      expect(deleteConfidence.overall).toBeLessThan(createConfidence.overall);
    });

    it('should factor in graph density', () => {
      const operation: Operation = {
        type: 'UPDATE_ENTITY',
        entityId: 'entity1',
        data: { name: 'Updated' },
      };

      const stats = {
        totalAffected: 3,
        byType: {},
        bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 0, CRITICAL: 0 },
        maxDepth: 1,
        percentageOfGraph: 10,
        criticalPaths: [],
      };

      const confidence = calculator.calculate(operation, stats);

      expect(confidence.factors.density).toBeGreaterThan(0);
      expect(confidence.factors.density).toBeLessThan(1);
    });

    it('should provide confidence range', () => {
      const operation: Operation = {
        type: 'UPDATE_ENTITY',
        entityId: 'entity1',
        data: { name: 'Updated' },
      };

      const stats = {
        totalAffected: 3,
        byType: {},
        bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 0, CRITICAL: 0 },
        maxDepth: 1,
        percentageOfGraph: 10,
        criticalPaths: [],
      };

      const confidence = calculator.calculate(operation, stats);

      expect(confidence.range.min).toBeLessThanOrEqual(confidence.overall);
      expect(confidence.range.max).toBeGreaterThanOrEqual(confidence.overall);
      expect(confidence.range.max - confidence.range.min).toBeLessThanOrEqual(0.25);
    });
  });
});