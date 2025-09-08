import { 
  BulkReview, 
  ChangeReview, 
  ReviewPolicy, 
  BulkDecision, 
  Condition 
} from '../types/review'
import { v4 as uuidv4 } from 'uuid'
import { ReviewWorkflow } from './review-workflow'
import { AuditLogger } from './audit-logger'

const generateId = () => uuidv4()

export class BulkReviewManager {
  private reviewWorkflow: ReviewWorkflow
  private auditLogger: AuditLogger

  constructor(reviewWorkflow: ReviewWorkflow, auditLogger: AuditLogger) {
    this.reviewWorkflow = reviewWorkflow
    this.auditLogger = auditLogger
  }

  async processBulkReview(
    reviewIds: string[],
    policy?: ReviewPolicy
  ): Promise<BulkReview> {
    const reviews = await this.loadReviews(reviewIds)

    const bulkReview: BulkReview = {
      id: generateId(),
      reviews,
      policy,
      status: 'processing',
      results: new Map()
    }

    // Log bulk review start
    await this.auditLogger.log('REVIEW_STARTED', {
      type: 'review',
      id: bulkReview.id
    }, {
      reviewCount: reviews.length,
      policyApplied: !!policy
    })

    try {
      for (const review of reviews) {
        const decision = await this.evaluateReview(review, policy)
        bulkReview.results.set(review.id, decision)

        if (decision.action === 'auto-approve') {
          await this.autoApprove(review)
        } else if (decision.action === 'auto-reject') {
          await this.autoReject(review)
        }

        // Log individual review decision
        await this.auditLogger.log('REVIEW_COMPLETED', {
          type: 'review',
          id: review.id
        }, {
          decision: decision.action,
          reason: decision.reason,
          bulkReviewId: bulkReview.id
        })
      }

      bulkReview.status = 'completed'
    } catch (error) {
      bulkReview.status = 'completed' // Mark as completed even if some failed
      console.error('Bulk review processing error:', error)
    }

    return bulkReview
  }

  async createReviewPolicy(
    name: string,
    conditions: {
      autoApprove?: Condition[]
      autoReject?: Condition[]
      requiresManualReview?: {
        types: string[]
        severities: string[]
      }
    }
  ): Promise<ReviewPolicy> {
    const policy: ReviewPolicy = {
      autoApprove: conditions.autoApprove ? {
        enabled: true,
        conditions: conditions.autoApprove
      } : undefined,
      autoReject: conditions.autoReject ? {
        enabled: true,
        conditions: conditions.autoReject
      } : undefined,
      requiresManualReview: conditions.requiresManualReview
    }

    // Persist policy
    await this.persistPolicy(name, policy)

    return policy
  }

  async getPresetPolicies(): Promise<Record<string, ReviewPolicy>> {
    return {
      'conservative': {
        autoApprove: {
          enabled: true,
          conditions: [
            { field: 'riskLevel', operator: 'equals', value: 'low' },
            { field: 'changeCount', operator: 'lessThan', value: 5 }
          ]
        },
        autoReject: {
          enabled: true,
          conditions: [
            { field: 'riskLevel', operator: 'equals', value: 'high' },
            { field: 'deleteCount', operator: 'greaterThan', value: 10 }
          ]
        }
      },
      'permissive': {
        autoApprove: {
          enabled: true,
          conditions: [
            { field: 'riskLevel', operator: 'equals', value: 'low' },
            { field: 'riskLevel', operator: 'equals', value: 'medium' }
          ]
        },
        autoReject: {
          enabled: true,
          conditions: [
            { field: 'deleteCount', operator: 'greaterThan', value: 50 }
          ]
        }
      },
      'strict': {
        autoApprove: {
          enabled: false,
          conditions: []
        },
        autoReject: {
          enabled: true,
          conditions: [
            { field: 'riskLevel', operator: 'equals', value: 'high' },
            { field: 'riskLevel', operator: 'equals', value: 'medium' },
            { field: 'deleteCount', operator: 'greaterThan', value: 5 }
          ]
        },
        requiresManualReview: {
          types: ['entity', 'edge'],
          severities: ['low', 'medium', 'high']
        }
      }
    }
  }

  async evaluateReviewBatch(
    reviews: ChangeReview[],
    policy?: ReviewPolicy
  ): Promise<Map<string, BulkDecision>> {
    const results = new Map<string, BulkDecision>()

    for (const review of reviews) {
      const decision = await this.evaluateReview(review, policy)
      results.set(review.id, decision)
    }

    return results
  }

  private async loadReviews(reviewIds: string[]): Promise<ChangeReview[]> {
    // TODO: Implement actual review loading from storage/API
    // For now, create mock reviews
    return reviewIds.map(id => ({
      id,
      cloneId: `clone-${id}`,
      status: 'reviewing' as const,
      changes: [],
      impactReport: {
        summary: {
          totalChanges: Math.floor(Math.random() * 20) + 1,
          entitiesAffected: Math.floor(Math.random() * 10) + 1,
          edgesAffected: Math.floor(Math.random() * 5) + 1,
          riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high'
        },
        details: {
          added: [],
          removed: [],
          modified: []
        }
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'user-1'
      },
      decisions: new Map()
    }))
  }

  private async evaluateReview(
    review: ChangeReview,
    policy?: ReviewPolicy
  ): Promise<BulkDecision> {
    if (!policy) {
      return { action: 'manual', reason: 'No policy defined' }
    }

    // Check for manual review requirements first
    if (policy.requiresManualReview) {
      const hasRequiredTypes = review.changes.some(change =>
        policy.requiresManualReview!.types.includes(change.type)
      )
      const hasRequiredSeverities = review.changes.some(change =>
        change.impact && policy.requiresManualReview!.severities.includes(change.impact.severity)
      )

      if (hasRequiredTypes || hasRequiredSeverities) {
        return { action: 'manual', reason: 'Requires manual review per policy' }
      }
    }

    // Check auto-reject conditions first (more restrictive)
    if (policy.autoReject?.enabled) {
      const meetsRejectConditions = policy.autoReject.conditions.some(
        condition => this.evaluateCondition(review, condition)
      )
      if (meetsRejectConditions) {
        return { action: 'auto-reject', reason: 'Meets auto-reject criteria' }
      }
    }

    // Check auto-approve conditions
    if (policy.autoApprove?.enabled) {
      const meetsApproveConditions = policy.autoApprove.conditions.every(
        condition => this.evaluateCondition(review, condition)
      )
      if (meetsApproveConditions) {
        return { action: 'auto-approve', reason: 'Meets auto-approve criteria' }
      }
    }

    return { action: 'manual', reason: 'Does not meet automatic criteria' }
  }

  private evaluateCondition(review: ChangeReview, condition: Condition): boolean {
    let value: any

    switch (condition.field) {
      case 'riskLevel':
        value = review.impactReport.summary.riskLevel
        break
      case 'changeCount':
        value = review.impactReport.summary.totalChanges
        break
      case 'entityCount':
        value = review.impactReport.summary.entitiesAffected
        break
      case 'edgeCount':
        value = review.impactReport.summary.edgesAffected
        break
      case 'deleteCount':
        value = review.impactReport.details.removed.length
        break
      case 'addCount':
        value = review.impactReport.details.added.length
        break
      case 'modifyCount':
        value = review.impactReport.details.modified.length
        break
      case 'warningCount':
        value = review.impactReport.warnings?.length || 0
        break
      default:
        return false
    }

    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'contains':
        return String(value).includes(String(condition.value))
      case 'lessThan':
        return Number(value) < Number(condition.value)
      case 'greaterThan':
        return Number(value) > Number(condition.value)
      default:
        return false
    }
  }

  private async autoApprove(review: ChangeReview): Promise<void> {
    try {
      // Create a temporary active review
      this.reviewWorkflow['activeReview'] = review
      await this.reviewWorkflow.acceptAll()

      console.log(`Auto-approved review: ${review.id}`)
    } catch (error) {
      console.error(`Failed to auto-approve review ${review.id}:`, error)
      throw error
    }
  }

  private async autoReject(review: ChangeReview): Promise<void> {
    try {
      // Create a temporary active review
      this.reviewWorkflow['activeReview'] = review
      await this.reviewWorkflow.rejectAll()

      console.log(`Auto-rejected review: ${review.id}`)
    } catch (error) {
      console.error(`Failed to auto-reject review ${review.id}:`, error)
      throw error
    }
  }

  private async persistPolicy(name: string, policy: ReviewPolicy): Promise<void> {
    try {
      // TODO: Persist to actual storage
      const stored = localStorage.getItem('review-policies')
      const policies = stored ? JSON.parse(stored) : {}
      policies[name] = policy
      localStorage.setItem('review-policies', JSON.stringify(policies))

      console.log(`Persisted policy: ${name}`)
    } catch (error) {
      console.error('Failed to persist policy:', error)
    }
  }

  // Analytics and reporting
  getBulkReviewStats(bulkReviews: BulkReview[]): {
    totalReviews: number
    autoApproved: number
    autoRejected: number
    requiresManual: number
    averageProcessingTime: number
    successRate: number
  } {
    let totalReviews = 0
    let autoApproved = 0
    let autoRejected = 0
    let requiresManual = 0

    bulkReviews.forEach(bulk => {
      bulk.results.forEach(decision => {
        totalReviews++
        switch (decision.action) {
          case 'auto-approve':
            autoApproved++
            break
          case 'auto-reject':
            autoRejected++
            break
          case 'manual':
            requiresManual++
            break
        }
      })
    })

    const processedAutomatically = autoApproved + autoRejected
    const successRate = totalReviews > 0 ? processedAutomatically / totalReviews : 0

    return {
      totalReviews,
      autoApproved,
      autoRejected,
      requiresManual,
      averageProcessingTime: 0, // TODO: Implement timing
      successRate: Math.round(successRate * 100) / 100
    }
  }

  // Policy testing
  async testPolicy(policy: ReviewPolicy, testReviews: ChangeReview[]): Promise<{
    policy: ReviewPolicy
    results: Array<{
      reviewId: string
      decision: BulkDecision
      actualDecision?: 'approve' | 'reject' | 'manual'
      match?: boolean
    }>
    accuracy: number
  }> {
    const results = []

    for (const review of testReviews) {
      const decision = await this.evaluateReview(review, policy)
      results.push({
        reviewId: review.id,
        decision
        // actualDecision and match would be filled from historical data
      })
    }

    return {
      policy,
      results,
      accuracy: 0 // Would calculate based on historical matches
    }
  }
}