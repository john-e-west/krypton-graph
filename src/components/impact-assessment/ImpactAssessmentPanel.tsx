import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Download, Eye, Play } from 'lucide-react';
import {
  ImpactAssessmentEngine,
  ImpactReport,
  Operation,
  Impact,
  Severity,
} from '@/services/impact-assessment';
import { ImpactVisualizer } from '@/services/impact-visualization';
import { ImpactReportGenerator } from '@/services/impact-report';
import { GraphClone } from '@/services/graph-clone';

interface ImpactAssessmentPanelProps {
  graphClone: GraphClone;
  operation: Operation;
  onApply?: () => void;
  onCancel?: () => void;
}

export const ImpactAssessmentPanel: React.FC<ImpactAssessmentPanelProps> = ({
  graphClone,
  operation,
  onApply,
  onCancel,
}) => {
  const [assessment, setAssessment] = useState<ImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualizer] = useState(() => new ImpactVisualizer());
  const [reportGenerator] = useState(() => new ImpactReportGenerator());

  useEffect(() => {
    if (operation) {
      runAssessment();
    }
  }, [operation]);

  const runAssessment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const engine = new ImpactAssessmentEngine(graphClone);
      const report = await engine.assessImpact(operation);
      setAssessment(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assess impact');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'json' | 'pdf' | 'html') => {
    if (!assessment) return;
    
    try {
      const blob = await reportGenerator.generateReport(assessment, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `impact-report-${assessment.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Info className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: Severity): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
    }
  };

  const renderImpactItem = (impact: Impact) => (
    <div key={impact.elementId} className="flex items-center justify-between p-3 border rounded-lg mb-2">
      <div className="flex items-center gap-3">
        {getSeverityIcon(impact.severity)}
        <div>
          <p className="font-medium">{impact.elementType}: {impact.elementId}</p>
          <p className="text-sm text-muted-foreground">{impact.type}</p>
          {impact.cause && (
            <p className="text-xs text-muted-foreground">Caused by: {impact.cause}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={getSeverityColor(impact.severity)}>
          {impact.severity}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {(impact.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessing Impact...</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impact Assessment</CardTitle>
          <CardDescription>
            Run an assessment to see the impact of your changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAssessment} className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Run Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasCriticalImpacts = assessment.statistics.bySeverity.CRITICAL > 0;
  const hasHighImpacts = assessment.statistics.bySeverity.HIGH > 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Assessment Summary</CardTitle>
          <CardDescription>
            Operation: {assessment.operation.type}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Critical Alert */}
          {hasCriticalImpacts && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical Impact Detected</AlertTitle>
              <AlertDescription>
                {assessment.statistics.bySeverity.CRITICAL} critical impacts require immediate attention
              </AlertDescription>
            </Alert>
          )}

          {/* High Alert */}
          {hasHighImpacts && !hasCriticalImpacts && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Impact Detected</AlertTitle>
              <AlertDescription>
                {assessment.statistics.bySeverity.HIGH} high-severity impacts identified
              </AlertDescription>
            </Alert>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {assessment.statistics.totalAffected}
                </div>
                <p className="text-xs text-muted-foreground">Total Affected</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {assessment.statistics.maxDepth}
                </div>
                <p className="text-xs text-muted-foreground">Max Depth</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {assessment.statistics.percentageOfGraph.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Graph Coverage</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {(assessment.confidence.overall * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </CardContent>
            </Card>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Confidence Score</span>
              <span>{(assessment.confidence.overall * 100).toFixed(1)}%</span>
            </div>
            <Progress value={assessment.confidence.overall * 100} />
            <p className="text-xs text-muted-foreground">
              Range: {(assessment.confidence.range.min * 100).toFixed(0)}% - {(assessment.confidence.range.max * 100).toFixed(0)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Impacts Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="direct">
                Direct ({assessment.direct.length})
              </TabsTrigger>
              <TabsTrigger value="indirect">
                Indirect ({assessment.indirect.length})
              </TabsTrigger>
              <TabsTrigger value="ripple">
                Ripple ({assessment.ripple.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="direct" className="space-y-2">
              {assessment.direct.length > 0 ? (
                assessment.direct.map(renderImpactItem)
              ) : (
                <p className="text-muted-foreground text-center py-4">No direct impacts</p>
              )}
            </TabsContent>
            
            <TabsContent value="indirect" className="space-y-2">
              {assessment.indirect.length > 0 ? (
                assessment.indirect.map(renderImpactItem)
              ) : (
                <p className="text-muted-foreground text-center py-4">No indirect impacts</p>
              )}
            </TabsContent>
            
            <TabsContent value="ripple" className="space-y-2">
              {assessment.ripple.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {Array.from(new Set(assessment.ripple.map(r => r.depth || 0))).sort().map(depth => {
                    const depthImpacts = assessment.ripple.filter(r => r.depth === depth);
                    return (
                      <AccordionItem key={depth} value={`depth-${depth}`}>
                        <AccordionTrigger>
                          Level {depth} ({depthImpacts.length} impacts)
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {depthImpacts.map(renderImpactItem)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <p className="text-muted-foreground text-center py-4">No ripple effects</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportReport('json')}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('pdf')}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport('html')}
              className="flex-1"
            >
              <Eye className="mr-2 h-4 w-4" />
              View HTML
            </Button>
          </div>
          
          <div className="flex gap-2 mt-4">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            {onApply && (
              <Button
                onClick={onApply}
                className="flex-1"
                disabled={hasCriticalImpacts}
              >
                Apply Changes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};