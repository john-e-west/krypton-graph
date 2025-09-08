import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChangeReviewPanel } from '@/components/review/ChangeReviewPanel'
import { ReviewManager } from '../services/review-manager'
import { ChangeReview, Change } from '../types/review'
import { RefreshCw, Play, BarChart3 } from 'lucide-react'

export function ReviewWorkflowDemo() {
  const [reviewManager] = useState(() => new ReviewManager())
  const [currentReview, setCurrentReview] = useState<ChangeReview | null>(null)
  const [systemStats, setSystemStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    updateStats()
  }, [reviewManager])

  const updateStats = () => {
    const stats = reviewManager.getSystemStats()
    setSystemStats(stats)
  }

  const generateMockReview = async () => {
    setIsLoading(true)
    
    try {
      // Generate mock changes
      const mockChanges: Change[] = [
        {
          id: 'change-1',
          type: 'CREATE_ENTITY',
          data: {
            id: 'entity-new-1',
            name: 'New Concept',
            type: 'concept',
            properties: { value: 'created', category: 'test' }
          },
          entityId: 'entity-new-1',
          impact: {
            severity: 'low',
            description: 'Creating a new concept entity with basic properties'
          }
        },
        {
          id: 'change-2',
          type: 'UPDATE_ENTITY',
          data: {
            id: 'entity-existing-1',
            name: 'Updated Concept',
            properties: { value: 'modified', category: 'updated' }
          },
          before: {
            id: 'entity-existing-1',
            name: 'Original Concept',
            properties: { value: 'original', category: 'test' }
          },
          after: {
            id: 'entity-existing-1',
            name: 'Updated Concept',
            properties: { value: 'modified', category: 'updated' }
          },
          entityId: 'entity-existing-1',
          impact: {
            severity: 'medium',
            description: 'Modifying existing concept properties'
          }
        },
        {
          id: 'change-3',
          type: 'CREATE_EDGE',
          data: {
            id: 'edge-new-1',
            source: 'entity-new-1',
            target: 'entity-existing-1',
            type: 'relates_to',
            properties: { strength: 'high' }
          },
          edgeId: 'edge-new-1',
          impact: {
            severity: 'low',
            description: 'Creating relationship between new and existing entities'
          }
        },
        {
          id: 'change-4',
          type: 'DELETE_ENTITY',
          data: {
            id: 'entity-old-1'
          },
          before: {
            id: 'entity-old-1',
            name: 'Deprecated Concept',
            properties: { status: 'deprecated' }
          },
          entityId: 'entity-old-1',
          impact: {
            severity: 'high',
            description: 'Deleting deprecated entity - may affect dependent relationships'
          }
        }
      ]

      // Create mock review
      const mockReview: ChangeReview = {
        id: `review-${Date.now()}`,
        cloneId: `clone-${Date.now()}`,
        status: 'reviewing',
        changes: mockChanges,
        impactReport: {
          summary: {
            totalChanges: mockChanges.length,
            entitiesAffected: 3,
            edgesAffected: 1,
            riskLevel: 'medium'
          },
          details: {
            added: mockChanges.filter(c => c.type.startsWith('CREATE')),
            removed: mockChanges.filter(c => c.type.startsWith('DELETE')),
            modified: mockChanges.filter(c => c.type.startsWith('UPDATE'))
          },
          warnings: [
            'High-risk delete operation detected',
            'Entity relationships may be affected'
          ],
          recommendations: [
            'Consider backing up affected data before proceeding',
            'Review dependent entities before deleting'
          ]
        },
        metadata: {
          createdAt: new Date(),
          createdBy: 'demo-user',
        },
        decisions: new Map()
      }

      // Simulate review creation
      reviewManager['reviewWorkflow']['activeReview'] = mockReview
      setCurrentReview(mockReview)
      
      // Add some sample annotations
      reviewManager.addAnnotation('change-1', 'This looks good to create', 'approval')
      reviewManager.addAnnotation('change-2', 'Are we sure about this property change?', 'concern')
      reviewManager.addAnnotation('change-4', 'This deletion seems risky - we should double check', 'concern')
      
      updateStats()
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptAll = async () => {
    if (!currentReview) return
    
    try {
      await reviewManager.acceptAll()
      setCurrentReview(null) // Clear current review
      updateStats()
    } catch (error) {
      console.error('Failed to accept all changes:', error)
    }
  }

  const handleRejectAll = async () => {
    if (!currentReview) return
    
    try {
      await reviewManager.rejectAll()
      setCurrentReview(null) // Clear current review
      updateStats()
    } catch (error) {
      console.error('Failed to reject all changes:', error)
    }
  }

  const handlePartialAccept = async (changeIds: string[]) => {
    if (!currentReview) return
    
    try {
      await reviewManager.acceptPartial(changeIds)
      setCurrentReview(null) // Clear current review
      updateStats()
    } catch (error) {
      console.error('Failed to partially accept changes:', error)
    }
  }

  const handleAnnotate = (changeId: string, annotation: any) => {
    reviewManager.addAnnotation(changeId, annotation.text, annotation.type)
    // Refresh current review to show new annotations
    if (currentReview) {
      setCurrentReview({ ...currentReview })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accept/Reject Workflow Demo</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive review system for graph changes with rollback capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={updateStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Stats
          </Button>
          <Button onClick={generateMockReview} disabled={isLoading}>
            <Play className="h-4 w-4 mr-1" />
            {isLoading ? 'Generating...' : 'Generate Mock Review'}
          </Button>
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{systemStats.reviews.total}</div>
                <div className="text-sm text-muted-foreground">Total Reviews</div>
                <Badge variant={systemStats.reviews.active > 0 ? "default" : "secondary"} className="mt-1">
                  {systemStats.reviews.active} Active
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemStats.annotations.total}</div>
                <div className="text-sm text-muted-foreground">Annotations</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Object.entries(systemStats.annotations.byType).map(([type, count]) => 
                    `${type}: ${count}`
                  ).join(', ')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemStats.rollbacks.available}</div>
                <div className="text-sm text-muted-foreground">Rollback Points</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.rollbacks.totalSize} total changes
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemStats.audit.entries}</div>
                <div className="text-sm text-muted-foreground">Audit Entries</div>
                <Badge 
                  variant={
                    systemStats.audit.riskScore.level === 'high' ? 'destructive' :
                    systemStats.audit.riskScore.level === 'medium' ? 'secondary' : 'outline'
                  }
                  className="mt-1"
                >
                  Risk: {systemStats.audit.riskScore.level}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="review">Current Review</TabsTrigger>
          <TabsTrigger value="history">Review History</TabsTrigger>
          <TabsTrigger value="rollbacks">Rollback Points</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          {currentReview ? (
            <ChangeReviewPanel
              review={currentReview}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
              onPartialAccept={handlePartialAccept}
              onAnnotate={handleAnnotate}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  No active review. Generate a mock review to see the interface in action.
                </div>
                <Button onClick={generateMockReview} disabled={isLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Mock Review
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review History</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStats?.reviews.completed > 0 ? (
                <div className="text-muted-foreground">
                  {systemStats.reviews.completed} completed reviews
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  No completed reviews yet. Complete a review to see history.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollbacks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rollback Points</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStats?.rollbacks.available > 0 ? (
                <div className="text-muted-foreground">
                  {systemStats.rollbacks.available} rollback points available
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  No rollback points yet. Complete a review to create rollback points.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStats?.audit.entries > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    {systemStats.audit.entries} audit entries recorded
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current risk level: {systemStats.audit.riskScore.level}
                  </div>
                  {systemStats.audit.riskScore.factors.length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <strong>Risk factors:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {systemStats.audit.riskScore.factors.map((factor: string, idx: number) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  No audit entries yet. Perform review actions to see audit trail.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}