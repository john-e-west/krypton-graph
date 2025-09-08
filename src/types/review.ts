export interface ChangeReview {
  id: string
  cloneId: string
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'partial'
  changes: Change[]
  impactReport: ImpactReport
  metadata: {
    createdAt: Date
    createdBy: string
    reviewedAt?: Date
    reviewedBy?: string
    comments?: Comment[]
  }
  decisions: Map<string, Decision>
}

export interface Change {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'CREATE_ENTITY' | 'CREATE_EDGE' | 'UPDATE_ENTITY' | 'UPDATE_EDGE' | 'DELETE_ENTITY' | 'DELETE_EDGE'
  data: any
  before?: any
  after?: any
  entityId?: string
  edgeId?: string
  impact?: {
    severity: 'low' | 'medium' | 'high'
    description: string
  }
}

export interface Decision {
  changeId: string
  action: 'accept' | 'reject' | 'defer'
  reason?: string
  timestamp: Date
  reviewerId: string
}

export interface ImpactReport {
  summary: {
    totalChanges: number
    entitiesAffected: number
    edgesAffected: number
    riskLevel: 'low' | 'medium' | 'high'
  }
  details: {
    added: any[]
    removed: any[]
    modified: any[]
  }
  warnings?: string[]
  recommendations?: string[]
}

export interface Comment {
  id: string
  text: string
  author: string
  timestamp: Date
  changeId?: string
}

export interface GraphSnapshot {
  id: string
  timestamp: Date
  entities: any[]
  edges: any[]
  metadata: Record<string, any>
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

export interface RollbackPlan {
  snapshotId: string
  operations: Operation[]
  estimatedTime: number
}

export interface Operation {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  target?: string
  data?: any
}

export interface Annotation {
  id: string
  changeId: string
  text: string
  author: string
  timestamp: Date
  type: 'comment' | 'concern' | 'approval'
  replies?: Annotation[]
}

export interface RollbackSnapshot {
  id: string
  timestamp: Date
  beforeState: GraphSnapshot
  afterState: GraphSnapshot
  changes: Change[]
  metadata: {
    reason?: string
    triggeredBy: string
  }
}

export interface AuditEntry {
  id: string
  timestamp: Date
  action: AuditAction
  actor: string
  target: {
    type: 'review' | 'change' | 'rollback'
    id: string
  }
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export type AuditAction = 
  | 'REVIEW_STARTED'
  | 'CHANGE_ACCEPTED'
  | 'CHANGE_REJECTED'
  | 'PARTIAL_ACCEPT'
  | 'ROLLBACK_INITIATED'
  | 'ANNOTATION_ADDED'
  | 'REVIEW_COMPLETED'

export interface AuditFilters {
  actor?: string
  action?: AuditAction[]
  targetType?: string[]
}

export interface AuditReport {
  period: { start: Date; end: Date }
  totalActions: number
  byAction: Record<AuditAction, number>
  byActor: Record<string, number>
  timeline: AuditEntry[]
  summary: string
}

export interface BulkReview {
  id: string
  reviews: ChangeReview[]
  policy?: ReviewPolicy
  status: 'pending' | 'processing' | 'completed'
  results: Map<string, BulkDecision>
}

export interface ReviewPolicy {
  autoApprove?: {
    enabled: boolean
    conditions: Condition[]
  }
  autoReject?: {
    enabled: boolean
    conditions: Condition[]
  }
  requiresManualReview?: {
    types: string[]
    severities: string[]
  }
}

export interface Condition {
  field: string
  operator: 'equals' | 'contains' | 'lessThan' | 'greaterThan'
  value: any
}

export interface BulkDecision {
  action: 'auto-approve' | 'auto-reject' | 'manual'
  reason: string
}

export interface ComparisonView {
  left: {
    title: string
    data: any
    highlights: Highlight[]
  }
  right: {
    title: string
    data: any
    highlights: Highlight[]
  }
  diff: DiffResult
}

export interface Highlight {
  path: string
  type: 'added' | 'removed' | 'modified'
  line?: number
}

export interface DiffResult {
  added: any[]
  removed: any[]
  modified: any[]
}