import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ChangeReview, Change, Annotation } from '../../types/review'
import { ImpactVisualization } from './ImpactVisualization'
import { SideBySideComparison } from './SideBySideComparison'
import { ChangeList } from './ChangeList'

interface ChangeReviewPanelProps {
  review: ChangeReview
  onAcceptAll: () => Promise<void>
  onRejectAll: () => Promise<void>
  onPartialAccept: (changeIds: string[]) => Promise<void>
  onAnnotate?: (changeId: string, annotation: Annotation) => void
}

export function ChangeReviewPanel({ 
  review, 
  onAcceptAll, 
  onRejectAll, 
  onPartialAccept,
  onAnnotate 
}: ChangeReviewPanelProps) {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [annotations, setAnnotations] = useState<Map<string, Annotation[]>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectChange = (changeId: string, selected: boolean) => {
    const newSelection = new Set(selectedChanges)
    if (selected) {
      newSelection.add(changeId)
    } else {
      newSelection.delete(changeId)
    }
    setSelectedChanges(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedChanges.size === review.changes.length) {
      setSelectedChanges(new Set())
    } else {
      setSelectedChanges(new Set(review.changes.map(c => c.id)))
    }
  }

  const handleAcceptAll = async () => {
    setIsProcessing(true)
    try {
      await onAcceptAll()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectAll = async () => {
    setIsProcessing(true)
    try {
      await onRejectAll()
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePartialAccept = async () => {
    if (selectedChanges.size === 0) return
    
    setIsProcessing(true)
    try {
      await onPartialAccept(Array.from(selectedChanges))
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadgeVariant = (status: ChangeReview['status']) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'reviewing': return 'default'
      case 'accepted': return 'default'
      case 'rejected': return 'destructive'
      case 'partial': return 'outline'
      default: return 'secondary'
    }
  }

  const getRiskLevelBadgeVariant = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'outline'
      case 'medium': return 'secondary'
      case 'high': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="review-panel h-full">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Change Review</CardTitle>
            <div className="flex gap-2">
              <Badge variant={getStatusBadgeVariant(review.status)}>
                {review.status}
              </Badge>
              <Badge variant={getRiskLevelBadgeVariant(review.impactReport.summary.riskLevel)}>
                Risk: {review.impactReport.summary.riskLevel}
              </Badge>
            </div>
          </div>
          
          {review.impactReport.warnings && review.impactReport.warnings.length > 0 && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Warnings:</strong>
                <ul className="list-disc list-inside mt-1">
                  {review.impactReport.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow overflow-hidden">
          <Tabs defaultValue="changes" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="changes">
                Changes ({review.changes.length})
              </TabsTrigger>
              <TabsTrigger value="impact">
                Impact Assessment
              </TabsTrigger>
              <TabsTrigger value="comparison">
                Comparison
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-grow overflow-hidden mt-4">
              <TabsContent value="changes" className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox 
                    checked={selectedChanges.size === review.changes.length && review.changes.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select All ({selectedChanges.size}/{review.changes.length} selected)
                  </span>
                </div>
                
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <ChangeList
                    changes={review.changes}
                    selectedChanges={selectedChanges}
                    onSelectChange={handleSelectChange}
                    annotations={annotations}
                    onAnnotate={onAnnotate}
                  />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="impact" className="h-full">
                <ScrollArea className="h-full">
                  <ImpactVisualization report={review.impactReport} />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="comparison" className="h-full">
                <SideBySideComparison
                  review={review}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between flex-shrink-0 border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isProcessing || review.status !== 'reviewing'}
              >
                Reject All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject All Changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reject all {review.changes.length} changes in this review. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRejectAll}>
                  Reject All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handlePartialAccept}
              disabled={isProcessing || selectedChanges.size === 0 || review.status !== 'reviewing'}
            >
              Accept Selected ({selectedChanges.size})
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default" 
                  disabled={isProcessing || review.status !== 'reviewing'}
                >
                  Accept All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Accept All Changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will accept and apply all {review.changes.length} changes in this review. 
                    You can rollback these changes later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAcceptAll}>
                    Accept All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}