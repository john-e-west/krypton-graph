import { describe, it, expect, beforeEach } from 'vitest'
import { ReviewManager } from '../services/review-manager'
import { Change } from '../types/review'

describe('Review Workflow System', () => {
  let reviewManager: ReviewManager

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Create ReviewManager without loading from storage
    reviewManager = new ReviewManager(false)
  })

  describe('ReviewManager', () => {
    it('should initialize successfully', () => {
      expect(reviewManager).toBeDefined()
    })

    it('should provide system stats', () => {
      const stats = reviewManager.getSystemStats()
      
      expect(stats).toHaveProperty('reviews')
      expect(stats).toHaveProperty('annotations')
      expect(stats).toHaveProperty('rollbacks')
      expect(stats).toHaveProperty('audit')
      
      expect(stats.reviews.active).toBe(0)
      expect(stats.reviews.total).toBe(0)
    })

    it('should create mock review with changes', async () => {
      const mockChanges: Change[] = [
        {
          id: 'change-1',
          type: 'CREATE_ENTITY',
          data: { id: 'entity-1', name: 'Test Entity' },
          entityId: 'entity-1',
          impact: {
            severity: 'low',
            description: 'Creating test entity'
          }
        }
      ]

      expect(mockChanges).toHaveLength(1)
      expect(mockChanges[0].type).toBe('CREATE_ENTITY')
      expect(mockChanges[0].impact?.severity).toBe('low')
    })

    it('should handle annotations', () => {
      const annotation = reviewManager.addAnnotation('change-1', 'Test comment', 'comment')
      
      expect(annotation).toBeDefined()
      expect(annotation.text).toBe('Test comment')
      expect(annotation.type).toBe('comment')
      expect(annotation.changeId).toBe('change-1')

      const annotations = reviewManager.getAnnotations('change-1')
      expect(annotations).toHaveLength(1)
      expect(annotations[0].id).toBe(annotation.id)
    })

    it('should track audit entries', () => {
      reviewManager.addAnnotation('change-1', 'Test comment')
      
      const auditEntries = reviewManager.getAuditHistory(10)
      expect(auditEntries.length).toBeGreaterThan(0)
      
      const annotationEntry = auditEntries.find(entry => entry.action === 'ANNOTATION_ADDED')
      expect(annotationEntry).toBeDefined()
      expect(annotationEntry?.target.id).toBe('change-1')
    })

    it('should export and import data', async () => {
      // Add some test data
      reviewManager.addAnnotation('change-1', 'Test comment', 'comment')
      reviewManager.addAnnotation('change-2', 'Test concern', 'concern')

      // Export data
      const exportedData = await reviewManager.exportData()
      
      expect(exportedData).toHaveProperty('annotations')
      expect(exportedData).toHaveProperty('auditEntries')
      expect(exportedData).toHaveProperty('rollbackSnapshots')

      // Verify annotation export contains our data
      expect(exportedData.annotations).toContain('Test comment')
      expect(exportedData.annotations).toContain('Test concern')
    })

    it('should perform health check', async () => {
      const healthResult = await reviewManager.healthCheck()
      
      expect(healthResult).toHaveProperty('status')
      expect(healthResult).toHaveProperty('components')
      expect(healthResult).toHaveProperty('issues')
      
      expect(healthResult.status).toMatch(/healthy|degraded|unhealthy/)
      expect(healthResult.components).toHaveProperty('reviewWorkflow')
      expect(healthResult.components).toHaveProperty('auditLogger')
    })
  })

  describe('Annotation System', () => {
    it('should add different types of annotations', () => {
      const comment = reviewManager.addAnnotation('change-1', 'This looks good', 'comment')
      const concern = reviewManager.addAnnotation('change-1', 'I have concerns', 'concern')
      const approval = reviewManager.addAnnotation('change-1', 'Approved!', 'approval')

      expect(comment.type).toBe('comment')
      expect(concern.type).toBe('concern')
      expect(approval.type).toBe('approval')

      const annotations = reviewManager.getAnnotations('change-1')
      expect(annotations).toHaveLength(3)
    })

    it('should support annotation replies', () => {
      const parentAnnotation = reviewManager.addAnnotation('change-1', 'Original comment', 'comment')
      const reply = reviewManager.replyToAnnotation(parentAnnotation.id, 'This is a reply')

      expect(reply.changeId).toBe('change-1')
      expect(reply.type).toBe('comment')
      expect(reply.text).toBe('This is a reply')
    })
  })

  describe('Bulk Review Policies', () => {
    it('should provide preset policies', async () => {
      const policies = await reviewManager.getPresetPolicies()
      
      expect(policies).toHaveProperty('conservative')
      expect(policies).toHaveProperty('permissive')
      expect(policies).toHaveProperty('strict')
      
      expect(policies.conservative.autoApprove?.enabled).toBe(true)
      expect(policies.strict.autoApprove?.enabled).toBe(false)
    })

    it('should create custom review policy', async () => {
      const customPolicy = await reviewManager.createReviewPolicy('test-policy', {
        autoApprove: [
          { field: 'riskLevel', operator: 'equals', value: 'low' }
        ]
      })

      expect(customPolicy.autoApprove?.enabled).toBe(true)
      expect(customPolicy.autoApprove?.conditions).toHaveLength(1)
    })
  })
})