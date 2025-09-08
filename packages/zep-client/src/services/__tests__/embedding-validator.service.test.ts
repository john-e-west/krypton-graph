import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingValidatorService, ValidationResult, QualityMetrics } from '../embedding-validator.service';
import { EmbeddingResponse } from '../../types';

describe('EmbeddingValidatorService', () => {
  let validatorService: EmbeddingValidatorService;

  beforeEach(() => {
    validatorService = new EmbeddingValidatorService();
  });

  describe('validateEmbedding', () => {
    it('should validate a correct embedding', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'test_chunk_1',
        embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.chunkId).toBe('test_chunk_1');
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0.7);
      expect(result.issues).toHaveLength(0);
      expect(result.metrics.dimensions).toBe(1536);
      expect(result.metrics.hasZeroVector).toBe(false);
    });

    it('should detect dimension mismatch', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'test_chunk_bad_dims',
        embedding: Array.from({ length: 768 }, () => Math.random()),
        dimensions: 768,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('dimension_mismatch');
      expect(result.issues[0].severity).toBe('error');
      expect(result.qualityScore).toBeLessThan(0.5);
    });

    it('should detect zero vector', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'test_chunk_zero',
        embedding: Array.from({ length: 1536 }, () => 0),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.type === 'zero_vector')).toBe(true);
      expect(result.metrics.hasZeroVector).toBe(true);
      expect(result.qualityScore).toBeLessThan(0.2);
    });

    it('should detect NaN values', () => {
      const embeddingData = Array.from({ length: 1536 }, (_, i) => 
        i < 10 ? NaN : Math.random()
      );

      const embedding: EmbeddingResponse = {
        chunkId: 'test_chunk_nan',
        embedding: embeddingData,
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.type === 'nan_values')).toBe(true);
      expect(result.qualityScore).toBeLessThan(0.3);
    });

    it('should detect abnormal norm', () => {
      // Create embedding with very small values (abnormal norm)
      const embedding: EmbeddingResponse = {
        chunkId: 'test_chunk_small_norm',
        embedding: Array.from({ length: 1536 }, () => 0.001),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.issues.some(issue => issue.type === 'abnormal_norm')).toBe(true);
      expect(result.metrics.norm).toBeLessThan(0.8);
    });

    it('should calculate quality score correctly', () => {
      const perfectEmbedding: EmbeddingResponse = {
        chunkId: 'perfect',
        embedding: Array.from({ length: 1536 }, (_, i) => 
          Math.sin(i) * 0.5 // Normalized-ish values
        ),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(perfectEmbedding);

      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple embeddings', () => {
      const embeddings: EmbeddingResponse[] = [
        {
          chunkId: 'batch_1',
          embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        },
        {
          chunkId: 'batch_2',
          embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        },
        {
          chunkId: 'batch_3',
          embedding: Array.from({ length: 768 }, () => Math.random()), // Wrong dimensions
          dimensions: 768,
          model: 'text-embedding-3-small',
          success: true
        }
      ];

      const result = validatorService.validateBatch(embeddings);

      expect(result.results).toHaveLength(3);
      expect(result.batchMetrics.totalEmbeddings).toBe(3);
      expect(result.batchMetrics.validEmbeddings).toBe(2);
      expect(result.batchMetrics.invalidEmbeddings).toBe(1);
      expect(result.anomalousEmbeddings).toHaveLength(1);
    });

    it('should calculate batch metrics correctly', () => {
      const embeddings: EmbeddingResponse[] = Array.from({ length: 10 }, (_, i) => ({
        chunkId: `batch_item_${i}`,
        embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      }));

      const result = validatorService.validateBatch(embeddings);

      expect(result.batchMetrics.totalEmbeddings).toBe(10);
      expect(result.batchMetrics.averageQualityScore).toBeGreaterThan(0);
      expect(result.batchMetrics.averageNorm).toBeGreaterThan(0);
      expect(result.batchMetrics.dimensionConsistency).toBe(true);
    });

    it('should identify anomalous embeddings', () => {
      const embeddings: EmbeddingResponse[] = [
        // Normal embeddings
        ...Array.from({ length: 8 }, (_, i) => ({
          chunkId: `normal_${i}`,
          embedding: Array.from({ length: 1536 }, () => Math.random() * 0.5),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        })),
        // Anomalous embeddings
        {
          chunkId: 'anomalous_1',
          embedding: Array.from({ length: 1536 }, () => 0), // Zero vector
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        },
        {
          chunkId: 'anomalous_2',
          embedding: Array.from({ length: 512 }, () => Math.random()), // Wrong dimensions
          dimensions: 512,
          model: 'text-embedding-3-small',
          success: true
        }
      ];

      const result = validatorService.validateBatch(embeddings);

      expect(result.anomalousEmbeddings.length).toBeGreaterThan(0);
      expect(result.anomalousEmbeddings.some(r => r.chunkId === 'anomalous_1')).toBe(true);
      expect(result.anomalousEmbeddings.some(r => r.chunkId === 'anomalous_2')).toBe(true);
    });
  });

  describe('known embeddings and similarity', () => {
    it('should add and use known embeddings', () => {
      const knownEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      validatorService.addKnownEmbedding('known_chunk_1', knownEmbedding);

      // Create similar embedding
      const similarEmbedding = knownEmbedding.map(val => val + (Math.random() - 0.5) * 0.1);

      const embedding: EmbeddingResponse = {
        chunkId: 'test_similarity',
        embedding: similarEmbedding,
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.metrics.similarityToKnown).toBeDefined();
      expect(result.metrics.similarityToKnown).toBeGreaterThan(0);
    });

    it('should reject embeddings with wrong dimensions for known embeddings', () => {
      const wrongDimensionEmbedding = Array.from({ length: 768 }, () => Math.random());
      validatorService.addKnownEmbedding('wrong_dims', wrongDimensionEmbedding);

      // The service should not add embeddings with wrong dimensions
      const embedding: EmbeddingResponse = {
        chunkId: 'test_after_wrong_dims',
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);
      
      // Should not have similarity score since wrong-dimension embedding wasn't added
      expect(result.metrics.similarityToKnown).toBeUndefined();
    });
  });

  describe('semantic coherence testing', () => {
    it('should test semantic coherence', () => {
      const embedding1 = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      const embedding2 = embedding1.map(val => val + (Math.random() - 0.5) * 0.1); // Similar
      const embedding3 = Array.from({ length: 1536 }, () => Math.random() - 0.5); // Different

      const testPairs = [
        {
          chunk1: 'similar_1',
          embedding1,
          chunk2: 'similar_2',
          embedding2,
          expectedSimilarity: 0.9
        },
        {
          chunk1: 'different_1',
          embedding1,
          chunk2: 'different_2',
          embedding2: embedding3,
          expectedSimilarity: 0.1
        }
      ];

      const result = validatorService.testSemanticCoherence(testPairs);

      expect(result.results).toHaveLength(2);
      expect(result.passed + result.failed).toBe(2);
      
      for (const testResult of result.results) {
        expect(testResult.actualSimilarity).toBeGreaterThanOrEqual(-1);
        expect(testResult.actualSimilarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('quality metrics and trends', () => {
    it('should calculate overall quality metrics', () => {
      // Process some batches first
      const embeddings1: EmbeddingResponse[] = Array.from({ length: 5 }, (_, i) => ({
        chunkId: `batch1_${i}`,
        embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      }));

      const embeddings2: EmbeddingResponse[] = Array.from({ length: 3 }, (_, i) => ({
        chunkId: `batch2_${i}`,
        embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      }));

      validatorService.validateBatch(embeddings1);
      validatorService.validateBatch(embeddings2);

      const metrics = validatorService.getOverallQualityMetrics();

      expect(metrics.totalEmbeddings).toBe(8);
      expect(metrics.validEmbeddings).toBeGreaterThan(0);
      expect(metrics.averageQualityScore).toBeGreaterThan(0);
      expect(metrics.qualityDistribution.excellent + 
             metrics.qualityDistribution.good + 
             metrics.qualityDistribution.fair + 
             metrics.qualityDistribution.poor).toBe(8);
    });

    it('should track quality trends', () => {
      // Process several batches
      for (let batch = 0; batch < 5; batch++) {
        const embeddings: EmbeddingResponse[] = Array.from({ length: 2 }, (_, i) => ({
          chunkId: `trend_batch_${batch}_${i}`,
          embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5),
          dimensions: 1536,
          model: 'text-embedding-3-small',
          success: true
        }));

        validatorService.validateBatch(embeddings);
      }

      const trend = validatorService.getQualityTrend(5);

      expect(trend.batches).toHaveLength(5);
      expect(trend.trend).toMatch(/^(improving|declining|stable)$/);
      
      for (const batch of trend.batches) {
        expect(batch.qualityScore).toBeGreaterThanOrEqual(0);
        expect(batch.qualityScore).toBeLessThanOrEqual(1);
        expect(batch.validationRate).toBeGreaterThanOrEqual(0);
        expect(batch.validationRate).toBeLessThanOrEqual(1);
      }
    });

    it('should handle empty metrics gracefully', () => {
      const freshValidator = new EmbeddingValidatorService();
      const metrics = freshValidator.getOverallQualityMetrics();

      expect(metrics.totalEmbeddings).toBe(0);
      expect(metrics.validEmbeddings).toBe(0);
      expect(metrics.averageQualityScore).toBe(0);
      expect(metrics.dimensionConsistency).toBe(true);
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle embeddings with extreme values', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'extreme_values',
        embedding: Array.from({ length: 1536 }, (_, i) => 
          i % 2 === 0 ? 1000 : -1000 // Extreme values
        ),
        dimensions: 1536,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result).toBeDefined();
      expect(result.chunkId).toBe('extreme_values');
      // Should detect abnormal norm
      expect(result.issues.some(issue => issue.type === 'abnormal_norm')).toBe(true);
    });

    it('should handle empty embedding array', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'empty_embedding',
        embedding: [],
        dimensions: 0,
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.type === 'dimension_mismatch')).toBe(true);
    });

    it('should handle mismatched embedding length and dimensions', () => {
      const embedding: EmbeddingResponse = {
        chunkId: 'mismatched_dims',
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        dimensions: 768, // Wrong dimension value
        model: 'text-embedding-3-small',
        success: true
      };

      const result = validatorService.validateEmbedding(embedding);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.type === 'dimension_mismatch')).toBe(true);
    });
  });
});