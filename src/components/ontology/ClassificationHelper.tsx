import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs';
import { 
  TrendingDown, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Target
} from 'lucide-react';

export interface ClassificationStats {
  totalItems: number;
  classifiedItems: number;
  unclassifiedItems: number;
  classificationRate: number;
  confidenceScores: number[];
  commonFailurePatterns: string[];
}

export interface ClassificationAnalysis {
  issues: {
    missingTypeCategories: string[];
    overlySpecificTypes: string[];
    overlyBroadTypes: string[];
    ambiguousPatterns: string[];
  };
  suggestions: {
    newTypeCategories: string[];
    typeAdjustments: Array<{
      currentType: string;
      suggestedType: string;
      reason: string;
    }>;
    improvementActions: Array<{
      action: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
  examples: Array<{
    text: string;
    currentClassification?: string;
    suggestedClassification: string;
    confidence: number;
  }>;
}

export interface ClassificationHelperProps {
  stats: ClassificationStats;
  analysis?: ClassificationAnalysis;
  documentId: string;
  onImprove: (improvements: any) => Promise<void>;
  onDismiss: () => void;
  className?: string;
}

export const ClassificationHelper: React.FC<ClassificationHelperProps> = ({
  stats,
  analysis,
  documentId,
  onImprove,
  onDismiss,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isImproving, setIsImproving] = useState(false);
  const [improvementProgress, setImprovementProgress] = useState(0);

  const shouldShow = stats.classificationRate < 0.8; // Show when below 80%

  const handleApplyImprovement = async (improvement: any) => {
    setIsImproving(true);
    setImprovementProgress(0);

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setImprovementProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onImprove(improvement);

      clearInterval(progressInterval);
      setImprovementProgress(100);

      setTimeout(() => {
        setIsImproving(false);
        setImprovementProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Failed to apply improvement:', error);
      setIsImproving(false);
      setImprovementProgress(0);
    }
  };

  const getClassificationColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <Card className={`border-l-4 border-l-orange-500 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Classification Needs Improvement</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Alert className="mb-4">
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>Low Classification Rate Detected</AlertTitle>
          <AlertDescription>
            Only {Math.round(stats.classificationRate * 100)}% of items were successfully 
            classified. Let's improve this to get better knowledge graph results.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="issues">Issues</TabsTab>
            <TabsTab value="suggestions">Suggestions</TabsTab>
            <TabsTab value="examples">Examples</TabsTab>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Classification Rate</span>
                  <span className={getClassificationColor(stats.classificationRate)}>
                    {Math.round(stats.classificationRate * 100)}%
                  </span>
                </div>
                <Progress 
                  value={stats.classificationRate * 100} 
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items Processed</span>
                  <span>{stats.totalItems}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Classified</span>
                  <span>{stats.classifiedItems}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Unclassified</span>
                  <span>{stats.unclassifiedItems}</span>
                </div>
              </div>
            </div>

            {stats.commonFailurePatterns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Common Failure Patterns</h4>
                <div className="space-y-1">
                  {stats.commonFailurePatterns.slice(0, 3).map((pattern, index) => (
                    <Badge key={index} variant="secondary" className="mr-2">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {analysis && (
              <>
                {analysis.issues.missingTypeCategories.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-1 text-red-500" />
                      Missing Type Categories
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis.issues.missingTypeCategories.map((category, index) => (
                        <Badge key={index} variant="destructive">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.issues.overlySpecificTypes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
                      Overly Specific Types
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis.issues.overlySpecificTypes.map((type, index) => (
                        <Badge key={index} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.issues.overlyBroadTypes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center">
                      <HelpCircle className="h-4 w-4 mr-1 text-blue-500" />
                      Overly Broad Types
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis.issues.overlyBroadTypes.map((type, index) => (
                        <Badge key={index} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {isImproving && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Applying Improvements...</span>
                </div>
                <Progress value={improvementProgress} className="h-2" />
              </div>
            )}

            {analysis && (
              <>
                {analysis.suggestions.newTypeCategories.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Suggested New Type Categories</h4>
                    <div className="space-y-2">
                      {analysis.suggestions.newTypeCategories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{category}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyImprovement({ type: 'addCategory', category })}
                            disabled={isImproving}
                          >
                            Add <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.suggestions.typeAdjustments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Suggested Type Adjustments</h4>
                    <div className="space-y-2">
                      {analysis.suggestions.typeAdjustments.map((adjustment, index) => (
                        <div key={index} className="p-2 border rounded space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Badge variant="secondary">{adjustment.currentType}</Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge variant="default">{adjustment.suggestedType}</Badge>
                          </div>
                          <p className="text-xs text-gray-600">{adjustment.reason}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyImprovement({ 
                              type: 'adjustType', 
                              adjustment 
                            })}
                            disabled={isImproving}
                          >
                            Apply Change
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.suggestions.improvementActions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
                    <div className="space-y-2">
                      {analysis.suggestions.improvementActions.map((action, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                          <Badge className={getImpactBadgeColor(action.impact)}>
                            {action.impact}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{action.action}</div>
                            <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyImprovement({ 
                              type: 'improvementAction', 
                              action 
                            })}
                            disabled={isImproving}
                          >
                            Execute
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            {analysis && analysis.examples.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Difficult Classification Examples</h4>
                {analysis.examples.map((example, index) => (
                  <div key={index} className="border rounded p-3 space-y-2">
                    <div className="text-sm font-medium">
                      "{example.text.substring(0, 100)}..."
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      {example.currentClassification && (
                        <>
                          <span>Current:</span>
                          <Badge variant="secondary">{example.currentClassification}</Badge>
                        </>
                      )}
                      <span>Suggested:</span>
                      <Badge variant="default">{example.suggestedClassification}</Badge>
                      <span className="text-gray-500">
                        ({Math.round(example.confidence * 100)}% confidence)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" className="text-blue-600">
            <BookOpen className="h-4 w-4 mr-2" />
            View Documentation
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button 
              onClick={() => handleApplyImprovement({ type: 'runFullAnalysis' })}
              disabled={isImproving}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Run Full Analysis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};