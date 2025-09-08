import { 
  ChangeReview, 
  Annotation, 
  RollbackSnapshot,
  AuditEntry,
  BulkReview,
  ReviewPolicy
} from '../types/review'
import { ReviewWorkflow } from './review-workflow'
import { AnnotationManager } from './annotation-manager'
import { RollbackManager } from './rollback-manager'
import { AuditLogger } from './audit-logger'
import { BulkReviewManager } from './bulk-review-manager'
import { ComparisonGenerator } from './comparison-generator'

/**
 * Main orchestrator for the Accept/Reject Workflow system
 * Provides a unified interface for all review-related operations
 */
export class ReviewManager {
  private reviewWorkflow: ReviewWorkflow
  private annotationManager: AnnotationManager
  private rollbackManager: RollbackManager
  private auditLogger: AuditLogger
  private bulkReviewManager: BulkReviewManager
  private comparisonGenerator: ComparisonGenerator

  constructor(loadFromStorage: boolean = true) {
    this.reviewWorkflow = new ReviewWorkflow()
    this.annotationManager = new AnnotationManager()
    this.rollbackManager = new RollbackManager()
    this.auditLogger = new AuditLogger()
    this.bulkReviewManager = new BulkReviewManager(this.reviewWorkflow, this.auditLogger)
    this.comparisonGenerator = new ComparisonGenerator()

    // Load persisted data only if not in test mode
    if (loadFromStorage && typeof process === 'undefined') {
      this.annotationManager.loadFromStorage()
    }
  }

  // Clear all data - useful for testing
  clearAll(): void {
    this.annotationManager.clearAll()
    // Clear other managers if needed
  }

  // Review Workflow Methods
  async startReview(cloneId: string): Promise<ChangeReview> {
    const review = await this.reviewWorkflow.startReview(cloneId)
    
    await this.auditLogger.log('REVIEW_STARTED', {
      type: 'review',
      id: review.id
    }, {
      cloneId,
      changeCount: review.changes.length,
      riskLevel: review.impactReport.summary.riskLevel
    })

    return review
  }

  async acceptAll(): Promise<void> {
    const review = this.reviewWorkflow.getActiveReview()
    if (!review) throw new Error('No active review')

    // Create snapshot before applying changes
    const beforeSnapshot = {
      id: 'before-' + review.id,
      timestamp: new Date(),
      entities: [], // TODO: Get actual current state
      edges: [],
      metadata: {}
    }

    await this.reviewWorkflow.acceptAll()

    // Create rollback snapshot
    const afterSnapshot = {
      id: 'after-' + review.id,
      timestamp: new Date(),
      entities: [], // TODO: Get actual new state
      edges: [],
      metadata: {}
    }

    await this.rollbackManager.createSnapshot(
      beforeSnapshot,
      afterSnapshot,
      review.changes
    )

    await this.auditLogger.log('CHANGE_ACCEPTED', {
      type: 'review',
      id: review.id
    }, {
      changeCount: review.changes.length,
      action: 'accept_all'
    })
  }

  async rejectAll(): Promise<void> {
    const review = this.reviewWorkflow.getActiveReview()
    if (!review) throw new Error('No active review')

    await this.reviewWorkflow.rejectAll()

    await this.auditLogger.log('CHANGE_REJECTED', {
      type: 'review',
      id: review.id
    }, {
      changeCount: review.changes.length,
      action: 'reject_all'
    })
  }

  async acceptPartial(changeIds: string[]): Promise<void> {
    const review = this.reviewWorkflow.getActiveReview()
    if (!review) throw new Error('No active review')

    // Create snapshot before applying changes
    const beforeSnapshot = {
      id: 'before-partial-' + review.id,
      timestamp: new Date(),
      entities: [],
      edges: [],
      metadata: {}
    }

    await this.reviewWorkflow.acceptPartial(changeIds)

    // Create rollback snapshot for accepted changes only
    const acceptedChanges = review.changes.filter(c => changeIds.includes(c.id))
    const afterSnapshot = {
      id: 'after-partial-' + review.id,
      timestamp: new Date(),
      entities: [],
      edges: [],
      metadata: {}
    }

    await this.rollbackManager.createSnapshot(
      beforeSnapshot,
      afterSnapshot,
      acceptedChanges
    )

    await this.auditLogger.log('PARTIAL_ACCEPT', {
      type: 'review',
      id: review.id
    }, {
      acceptedCount: changeIds.length,
      rejectedCount: review.changes.length - changeIds.length,
      changeIds
    })
  }

  getActiveReview(): ChangeReview | null {
    return this.reviewWorkflow.getActiveReview()
  }

  getReviewHistory(): ChangeReview[] {
    return this.reviewWorkflow.getReviewHistory()
  }

  // Annotation Methods
  addAnnotation(changeId: string, text: string, type: Annotation['type'] = 'comment'): Annotation {
    const annotation = this.annotationManager.addAnnotation(changeId, text, type)
    
    // Make audit logging synchronous for testing
    this.auditLogger.log('ANNOTATION_ADDED', {
      type: 'change',
      id: changeId
    }, {
      annotationId: annotation.id,
      annotationType: type,
      textLength: text.length
    }).catch(error => {
      console.error('Failed to log audit entry:', error)
    })

    return annotation
  }

  replyToAnnotation(parentId: string, text: string): Annotation {
    return this.annotationManager.replyToAnnotation(parentId, text)
  }

  getAnnotations(changeId: string): Annotation[] {
    return this.annotationManager.getAnnotations(changeId)
  }

  getAllAnnotations(): Map<string, Annotation[]> {
    return this.annotationManager.getAllAnnotations()
  }

  // Rollback Methods
  async rollbackToSnapshot(snapshotId: string, reason?: string): Promise<void> {
    await this.rollbackManager.rollback(snapshotId, reason)

    await this.auditLogger.log('ROLLBACK_INITIATED', {
      type: 'rollback',
      id: snapshotId
    }, {
      reason: reason || 'User requested rollback'
    })
  }

  getRollbackSnapshots(): RollbackSnapshot[] {
    return this.rollbackManager.getSnapshots()
  }

  async canRollback(snapshotId: string): Promise<{
    canRollback: boolean
    reason?: string
    warnings?: string[]
  }> {
    return this.rollbackManager.canRollback(snapshotId)
  }

  // Bulk Review Methods
  async processBulkReview(reviewIds: string[], policy?: ReviewPolicy): Promise<BulkReview> {
    return this.bulkReviewManager.processBulkReview(reviewIds, policy)
  }

  async getPresetPolicies(): Promise<Record<string, ReviewPolicy>> {
    return this.bulkReviewManager.getPresetPolicies()
  }

  async createReviewPolicy(
    name: string,
    conditions: {
      autoApprove?: any[]
      autoReject?: any[]
      requiresManualReview?: any
    }
  ): Promise<ReviewPolicy> {
    return this.bulkReviewManager.createReviewPolicy(name, conditions)
  }

  // Audit Methods
  getAuditHistory(limit: number = 50): AuditEntry[] {
    return this.auditLogger.getRecentEntries(limit)
  }

  async generateAuditReport(startDate: Date, endDate: Date): Promise<any> {
    return this.auditLogger.generateAuditReport(startDate, endDate)
  }

  async searchAuditEntries(query: string): Promise<AuditEntry[]> {
    return this.auditLogger.searchEntries(query)
  }

  // Comparison Methods
  generateComparison(current: any, proposed: any) {
    return this.comparisonGenerator.generateComparison(current, proposed)
  }

  // Utility Methods
  async exportData(): Promise<{
    annotations: string
    auditEntries: string
    rollbackSnapshots: string
  }> {
    return {
      annotations: this.annotationManager.exportAnnotations(),
      auditEntries: this.auditLogger.exportAuditData(),
      rollbackSnapshots: this.rollbackManager.exportSnapshots()
    }
  }

  async importData(data: {
    annotations?: string
    auditEntries?: string
    rollbackSnapshots?: string
  }): Promise<void> {
    if (data.annotations) {
      this.annotationManager.importAnnotations(data.annotations)
    }
    
    if (data.auditEntries) {
      this.auditLogger.importAuditData(data.auditEntries)
    }
    
    if (data.rollbackSnapshots) {
      this.rollbackManager.importSnapshots(data.rollbackSnapshots)
    }
  }

  // Statistics and Analytics
  getSystemStats(): {
    reviews: {
      active: number
      completed: number
      total: number
    }
    annotations: {
      total: number
      byType: Record<string, number>
    }
    rollbacks: {
      available: number
      totalSize: number
    }
    audit: {
      entries: number
      riskScore: any
    }
  } {
    const reviews = this.reviewWorkflow.getReviewHistory()
    const annotations = this.annotationManager.getAnnotationStats()
    const snapshots = this.rollbackManager.getSnapshots()
    const riskScore = this.auditLogger.getRiskScore()

    return {
      reviews: {
        active: this.reviewWorkflow.getActiveReview() ? 1 : 0,
        completed: reviews.length,
        total: reviews.length + (this.reviewWorkflow.getActiveReview() ? 1 : 0)
      },
      annotations: {
        total: annotations.totalAnnotations,
        byType: annotations.byType
      },
      rollbacks: {
        available: snapshots.length,
        totalSize: snapshots.reduce((acc, s) => acc + s.changes.length, 0)
      },
      audit: {
        entries: this.auditLogger.getRecentEntries(1000).length,
        riskScore
      }
    }
  }

  // Cleanup and maintenance
  async performMaintenance(): Promise<void> {
    // Clean up old rollback snapshots
    await this.rollbackManager.cleanup()
    
    console.log('System maintenance completed')
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<string, boolean>
    issues: string[]
  }> {
    const issues: string[] = []
    const components = {
      reviewWorkflow: true,
      annotationManager: true,
      rollbackManager: true,
      auditLogger: true,
      bulkReviewManager: true
    }

    try {
      // Test basic functionality
      const stats = this.getSystemStats()
      if (stats.audit.riskScore.level === 'high') {
        issues.push('High risk score detected in audit log')
      }
    } catch (error) {
      components.auditLogger = false
      issues.push('Audit logger health check failed')
    }

    const healthyComponents = Object.values(components).filter(Boolean).length
    const totalComponents = Object.keys(components).length
    const healthRatio = healthyComponents / totalComponents

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthRatio >= 1) status = 'healthy'
    else if (healthRatio >= 0.7) status = 'degraded'
    else status = 'unhealthy'

    return {
      status,
      components,
      issues
    }
  }
}