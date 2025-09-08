import { EmbeddingResponse } from '../types';

export interface EmbeddingQuality {
  averageNorm: number;      // Should be ~1.0
  zeroVectorCount: number;  // Should be 0
  dimensionality: number;   // Must be 1536
  similarityScore: number;  // Average cosine similarity
}

export interface ValidationResult {
  chunkId: string;
  isValid: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
  metrics: {
    norm: number;
    dimensions: number;
    hasZeroVector: boolean;
    similarityToKnown?: number;
  };
}

export interface ValidationIssue {
  type: 'dimension_mismatch' | 'zero_vector' | 'abnormal_norm' | 'low_similarity' | 'nan_values';
  severity: 'error' | 'warning';
  message: string;
  value?: number;
  expected?: number;
}

export interface QualityMetrics {
  totalEmbeddings: number;
  validEmbeddings: number;
  invalidEmbeddings: number;
  averageQualityScore: number;
  averageNorm: number;
  dimensionConsistency: boolean;
  anomalousEmbeddings: number;
  qualityDistribution: {
    excellent: number; // 0.9-1.0
    good: number;      // 0.7-0.9
    fair: number;      // 0.5-0.7
    poor: number;      // 0.0-0.5
  };
}

export class EmbeddingValidatorService {
  private readonly EXPECTED_DIMENSIONS = 1536;
  private readonly NORMAL_NORM_RANGE = { min: 0.8, max: 1.2 };
  private readonly MIN_SIMILARITY_THRESHOLD = 0.1;
  private readonly QUALITY_THRESHOLDS = {
    excellent: 0.9,
    good: 0.7,
    fair: 0.5
  };

  // Known good embeddings for similarity testing
  private knownEmbeddings: Map<string, number[]> = new Map();
  private qualityHistory: QualityMetrics[] = [];

  /**
   * Validate a single embedding
   */
  validateEmbedding(embedding: EmbeddingResponse): ValidationResult {
    const issues: ValidationIssue[] = [];
    let qualityScore = 1.0;

    // Check dimensions
    const dimensionCheck = this.validateDimensions(embedding);
    if (!dimensionCheck.valid) {
      issues.push({
        type: 'dimension_mismatch',
        severity: 'error',
        message: `Expected ${this.EXPECTED_DIMENSIONS} dimensions, got ${embedding.dimensions}`,
        value: embedding.dimensions,
        expected: this.EXPECTED_DIMENSIONS
      });
      qualityScore -= 0.5;
    }

    // Check for zero vector
    const zeroVectorCheck = this.checkZeroVector(embedding.embedding);
    if (zeroVectorCheck.isZero) {
      issues.push({
        type: 'zero_vector',
        severity: 'error',
        message: 'Embedding is a zero vector',
        value: 0
      });
      qualityScore -= 0.8;
    }

    // Check for NaN values
    const nanCheck = this.checkNaNValues(embedding.embedding);
    if (nanCheck.hasNaN) {
      issues.push({
        type: 'nan_values',
        severity: 'error',
        message: `Found ${nanCheck.count} NaN values in embedding`,
        value: nanCheck.count
      });
      qualityScore -= 0.7;
    }

    // Calculate and validate norm
    const norm = this.calculateNorm(embedding.embedding);
    if (norm < this.NORMAL_NORM_RANGE.min || norm > this.NORMAL_NORM_RANGE.max) {
      issues.push({
        type: 'abnormal_norm',
        severity: 'warning',
        message: `Embedding norm ${norm.toFixed(3)} is outside normal range [${this.NORMAL_NORM_RANGE.min}, ${this.NORMAL_NORM_RANGE.max}]`,
        value: norm,
        expected: 1.0
      });
      qualityScore -= 0.2;
    }

    // Check similarity to known good embeddings
    let similarityToKnown: number | undefined;
    if (this.knownEmbeddings.size > 0) {
      similarityToKnown = this.calculateMaxSimilarityToKnown(embedding.embedding);
      if (similarityToKnown < this.MIN_SIMILARITY_THRESHOLD) {
        issues.push({
          type: 'low_similarity',
          severity: 'warning',
          message: `Low similarity to known embeddings: ${similarityToKnown.toFixed(3)}`,
          value: similarityToKnown,
          expected: this.MIN_SIMILARITY_THRESHOLD
        });
        qualityScore -= 0.1;
      }
    }

    // Ensure quality score is non-negative
    qualityScore = Math.max(0, qualityScore);

    return {
      chunkId: embedding.chunkId,
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      qualityScore: Math.round(qualityScore * 1000) / 1000, // Round to 3 decimal places
      issues,
      metrics: {
        norm,
        dimensions: embedding.embedding.length,
        hasZeroVector: zeroVectorCheck.isZero,
        similarityToKnown
      }
    };
  }

  /**
   * Validate multiple embeddings and return batch results
   */
  validateBatch(embeddings: EmbeddingResponse[]): {
    results: ValidationResult[];
    batchMetrics: QualityMetrics;
    anomalousEmbeddings: ValidationResult[];
  } {
    const results = embeddings.map(emb => this.validateEmbedding(emb));
    const batchMetrics = this.calculateBatchMetrics(results);
    const anomalousEmbeddings = this.flagAnomalousEmbeddings(results);

    // Add to quality history
    this.qualityHistory.push(batchMetrics);

    // Keep only last 100 batch metrics for history
    if (this.qualityHistory.length > 100) {
      this.qualityHistory = this.qualityHistory.slice(-100);
    }

    return {
      results,
      batchMetrics,
      anomalousEmbeddings
    };
  }

  /**
   * Add known good embeddings for similarity testing
   */
  addKnownEmbedding(chunkId: string, embedding: number[]): void {
    if (embedding.length === this.EXPECTED_DIMENSIONS) {
      this.knownEmbeddings.set(chunkId, [...embedding]);
    }
  }

  /**
   * Test semantic coherence using known similar chunks
   */
  testSemanticCoherence(
    testPairs: Array<{ chunk1: string; embedding1: number[]; chunk2: string; embedding2: number[]; expectedSimilarity: number }>
  ): {
    passed: number;
    failed: number;
    results: Array<{
      pair: string;
      expectedSimilarity: number;
      actualSimilarity: number;
      passed: boolean;
    }>;
  } {
    const results = testPairs.map(pair => {
      const actualSimilarity = this.calculateCosineSimilarity(pair.embedding1, pair.embedding2);
      const tolerance = 0.1; // Allow 10% tolerance
      const passed = Math.abs(actualSimilarity - pair.expectedSimilarity) <= tolerance;

      return {
        pair: `${pair.chunk1} <-> ${pair.chunk2}`,
        expectedSimilarity: pair.expectedSimilarity,
        actualSimilarity: Math.round(actualSimilarity * 1000) / 1000,
        passed
      };
    });

    return {
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    };
  }

  /**
   * Get quality metrics for all processed embeddings
   */
  getOverallQualityMetrics(): QualityMetrics {
    if (this.qualityHistory.length === 0) {
      return this.getEmptyMetrics();
    }

    // Aggregate metrics from history
    const totalEmbeddings = this.qualityHistory.reduce((sum, m) => sum + m.totalEmbeddings, 0);
    const validEmbeddings = this.qualityHistory.reduce((sum, m) => sum + m.validEmbeddings, 0);
    const avgQualitySum = this.qualityHistory.reduce((sum, m) => sum + (m.averageQualityScore * m.totalEmbeddings), 0);
    const avgNormSum = this.qualityHistory.reduce((sum, m) => sum + (m.averageNorm * m.totalEmbeddings), 0);
    
    const qualityDistribution = this.qualityHistory.reduce((acc, m) => ({
      excellent: acc.excellent + m.qualityDistribution.excellent,
      good: acc.good + m.qualityDistribution.good,
      fair: acc.fair + m.qualityDistribution.fair,
      poor: acc.poor + m.qualityDistribution.poor
    }), { excellent: 0, good: 0, fair: 0, poor: 0 });

    return {
      totalEmbeddings,
      validEmbeddings,
      invalidEmbeddings: totalEmbeddings - validEmbeddings,
      averageQualityScore: totalEmbeddings > 0 ? avgQualitySum / totalEmbeddings : 0,
      averageNorm: totalEmbeddings > 0 ? avgNormSum / totalEmbeddings : 0,
      dimensionConsistency: this.qualityHistory.every(m => m.dimensionConsistency),
      anomalousEmbeddings: this.qualityHistory.reduce((sum, m) => sum + m.anomalousEmbeddings, 0),
      qualityDistribution
    };
  }

  /**
   * Get quality trend over time
   */
  getQualityTrend(lastNBatches: number = 10): {
    batches: Array<{
      timestamp: Date;
      qualityScore: number;
      validationRate: number;
    }>;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const recentBatches = this.qualityHistory.slice(-lastNBatches);
    
    const batches = recentBatches.map((metrics, index) => ({
      timestamp: new Date(Date.now() - (recentBatches.length - index - 1) * 60000), // Assuming 1 minute intervals
      qualityScore: metrics.averageQualityScore,
      validationRate: metrics.totalEmbeddings > 0 ? metrics.validEmbeddings / metrics.totalEmbeddings : 0
    }));

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (batches.length >= 3) {
      const recent = batches.slice(-3).map(b => b.qualityScore);
      const older = batches.slice(0, 3).map(b => b.qualityScore);
      
      const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
      const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
      
      if (recentAvg > olderAvg + 0.05) trend = 'improving';
      else if (recentAvg < olderAvg - 0.05) trend = 'declining';
    }

    return { batches, trend };
  }

  /**
   * Private: Validate dimensions
   */
  private validateDimensions(embedding: EmbeddingResponse): { valid: boolean } {
    return { 
      valid: embedding.embedding.length === this.EXPECTED_DIMENSIONS && 
             embedding.dimensions === this.EXPECTED_DIMENSIONS 
    };
  }

  /**
   * Private: Check for zero vector
   */
  private checkZeroVector(embedding: number[]): { isZero: boolean } {
    return { isZero: embedding.every(val => val === 0) };
  }

  /**
   * Private: Check for NaN values
   */
  private checkNaNValues(embedding: number[]): { hasNaN: boolean; count: number } {
    const nanCount = embedding.filter(val => isNaN(val)).length;
    return { hasNaN: nanCount > 0, count: nanCount };
  }

  /**
   * Private: Calculate L2 norm
   */
  private calculateNorm(embedding: number[]): number {
    return Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * Private: Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(emb1: number[], emb2: number[]): number {
    if (emb1.length !== emb2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < emb1.length; i++) {
      dotProduct += emb1[i] * emb2[i];
      norm1 += emb1[i] * emb1[i];
      norm2 += emb2[i] * emb2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Private: Calculate maximum similarity to known embeddings
   */
  private calculateMaxSimilarityToKnown(embedding: number[]): number {
    let maxSimilarity = 0;
    
    for (const knownEmbedding of this.knownEmbeddings.values()) {
      const similarity = this.calculateCosineSimilarity(embedding, knownEmbedding);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  }

  /**
   * Private: Calculate metrics for a batch of validation results
   */
  private calculateBatchMetrics(results: ValidationResult[]): QualityMetrics {
    const totalEmbeddings = results.length;
    const validEmbeddings = results.filter(r => r.isValid).length;
    const averageQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / totalEmbeddings;
    const averageNorm = results.reduce((sum, r) => sum + r.metrics.norm, 0) / totalEmbeddings;
    const dimensionConsistency = results.every(r => r.metrics.dimensions === this.EXPECTED_DIMENSIONS);
    
    const qualityDistribution = results.reduce((acc, r) => {
      if (r.qualityScore >= this.QUALITY_THRESHOLDS.excellent) acc.excellent++;
      else if (r.qualityScore >= this.QUALITY_THRESHOLDS.good) acc.good++;
      else if (r.qualityScore >= this.QUALITY_THRESHOLDS.fair) acc.fair++;
      else acc.poor++;
      return acc;
    }, { excellent: 0, good: 0, fair: 0, poor: 0 });

    return {
      totalEmbeddings,
      validEmbeddings,
      invalidEmbeddings: totalEmbeddings - validEmbeddings,
      averageQualityScore: Math.round(averageQualityScore * 1000) / 1000,
      averageNorm: Math.round(averageNorm * 1000) / 1000,
      dimensionConsistency,
      anomalousEmbeddings: this.flagAnomalousEmbeddings(results).length,
      qualityDistribution
    };
  }

  /**
   * Private: Flag anomalous embeddings
   */
  private flagAnomalousEmbeddings(results: ValidationResult[]): ValidationResult[] {
    const qualityScores = results.map(r => r.qualityScore);
    const mean = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    const stdDev = Math.sqrt(
      qualityScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / qualityScores.length
    );
    
    const threshold = mean - (2 * stdDev); // 2 standard deviations below mean
    
    return results.filter(r => r.qualityScore < threshold || r.issues.some(i => i.severity === 'error'));
  }

  /**
   * Private: Get empty metrics object
   */
  private getEmptyMetrics(): QualityMetrics {
    return {
      totalEmbeddings: 0,
      validEmbeddings: 0,
      invalidEmbeddings: 0,
      averageQualityScore: 0,
      averageNorm: 0,
      dimensionConsistency: true,
      anomalousEmbeddings: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 }
    };
  }
}