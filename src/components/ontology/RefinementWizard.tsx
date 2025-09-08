'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Target, 
  TrendingUp,
  Lightbulb,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RefinementSuggestion {
  id: string
  type: 'merge' | 'split' | 'attribute' | 'pattern'
  title: string
  description: string
  expectedImprovement: number
  effort: 'low' | 'medium' | 'high'
  priority: number
  affectedTypes: string[]
  details: {
    currentClassification?: number
    projectedClassification?: number
    itemsAffected?: number
    confidence?: number
  }
}

interface RefinementStep {
  id: string
  title: string
  description: string
  suggestions: RefinementSuggestion[]
  completed: boolean
}

interface RefinementWizardProps {
  currentClassificationRate: number
  targetRate?: number
  steps: RefinementStep[]
  onSuggestionApply: (suggestionId: string) => Promise<void>
  onSuggestionSkip: (suggestionId: string) => void
  onStepComplete: (stepId: string) => void
  onClose: () => void
  className?: string
}

export function RefinementWizard({
  currentClassificationRate,
  targetRate = 95,
  steps,
  onSuggestionApply,
  onSuggestionSkip,
  onStepComplete,
  onClose,
  className
}: RefinementWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)
  const [appliedSuggestions, setAppliedSuggestions] = React.useState<Set<string>>(new Set())
  const [applyingId, setApplyingId] = React.useState<string | null>(null)

  const currentStep = steps[currentStepIndex]
  const completedSteps = steps.filter(step => step.completed).length
  const totalSteps = steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const getEffortBadge = (effort: 'low' | 'medium' | 'high') => {
    const variants = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    return variants[effort]
  }

  const handleApplySuggestion = async (suggestion: RefinementSuggestion) => {
    setApplyingId(suggestion.id)
    try {
      await onSuggestionApply(suggestion.id)
      setAppliedSuggestions(prev => new Set(prev).add(suggestion.id))
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    } finally {
      setApplyingId(null)
    }
  }

  const handleSkipSuggestion = (suggestion: RefinementSuggestion) => {
    onSuggestionSkip(suggestion.id)
    setAppliedSuggestions(prev => new Set(prev).add(suggestion.id))
  }

  const handleStepComplete = () => {
    if (currentStep) {
      onStepComplete(currentStep.id)
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1)
      }
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const getProjectedImprovement = () => {
    const appliedSuggestionsArray = Array.from(appliedSuggestions)
    return appliedSuggestionsArray.reduce((total, suggestionId) => {
      const suggestion = steps
        .flatMap(step => step.suggestions)
        .find(s => s.id === suggestionId)
      return total + (suggestion?.expectedImprovement || 0)
    }, 0)
  }

  const projectedRate = Math.min(currentClassificationRate + getProjectedImprovement(), 100)
  const isTargetReached = projectedRate >= targetRate

  if (!currentStep) {
    return null
  }

  return (
    <Card className={cn("max-w-4xl mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Type Refinement Wizard
            </CardTitle>
            <CardDescription>
              Improve your classification rate with guided suggestions
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Progress: Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>{completedSteps} completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {currentClassificationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Current</div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                projectedRate >= targetRate ? "text-green-600" : "text-blue-600"
              )}>
                {projectedRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Projected</div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {targetRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Target</div>
            </div>
          </div>

          {isTargetReached && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Target classification rate achieved!
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">{currentStep.title}</h3>
            {currentStep.completed && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </div>
          <p className="text-muted-foreground mb-4">{currentStep.description}</p>
          
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {currentStep.suggestions.map((suggestion, index) => {
                const isApplied = appliedSuggestions.has(suggestion.id)
                const isApplying = applyingId === suggestion.id
                
                return (
                  <Card key={suggestion.id} className={cn(
                    "border-l-4",
                    isApplied ? "border-l-green-500 bg-green-50/50" : "border-l-blue-500"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isApplied ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          </div>
                          <CardDescription>{suggestion.description}</CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getEffortBadge(suggestion.effort)}>
                            {suggestion.effort} effort
                          </Badge>
                          <Badge variant="secondary">
                            +{suggestion.expectedImprovement.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Impact</div>
                          <div className="text-muted-foreground">
                            {suggestion.details.itemsAffected} items affected
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Confidence</div>
                          <div className="text-muted-foreground">
                            {(suggestion.details.confidence || 0) * 100}% sure
                          </div>
                        </div>
                      </div>
                      
                      {suggestion.affectedTypes.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1">Affected Types</div>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.affectedTypes.map(type => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!isApplied && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApplySuggestion(suggestion)}
                            disabled={isApplying}
                            size="sm"
                            className="flex-1"
                          >
                            {isApplying ? 'Applying...' : 'Apply'}
                          </Button>
                          <Button
                            onClick={() => handleSkipSuggestion(suggestion)}
                            variant="outline"
                            size="sm"
                          >
                            Skip
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {!currentStep.completed && (
              <Button onClick={handleStepComplete}>
                Complete Step
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleNextStep}
              disabled={currentStepIndex === steps.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}