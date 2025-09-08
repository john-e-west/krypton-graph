import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertTriangle, Download, FileText } from 'lucide-react'
import type { ValidationReport as ValidationReportType, TestDataSet } from '@/types/testing'

interface ValidationReportProps {
  testDataSet: TestDataSet
}

export default function ValidationReport({ testDataSet }: ValidationReportProps) {
  const generateReport = (): ValidationReportType => {
    const validEntities = testDataSet.entities.filter(e => e.validation.isValid)
    const invalidEntities = testDataSet.entities.filter(e => !e.validation.isValid)
    const validEdges = testDataSet.edges.filter(e => e.validation.isValid)
    const invalidEdges = testDataSet.edges.filter(e => !e.validation.isValid)

    const entityValidation = testDataSet.entities.map(entity => ({
      entityId: entity.id,
      entityType: entity.entityTypeName,
      isValid: entity.validation.isValid,
      errors: entity.validation.errors.map(err => ({
        field: err.field,
        value: entity.data[err.field],
        error: err.message,
        constraint: 'validation'
      }))
    }))

    const edgeValidation = testDataSet.edges.map(edge => ({
      edgeId: edge.id,
      edgeType: edge.edgeTypeName,
      isValid: edge.validation.isValid,
      errors: edge.validation.errors.map(err => ({
        field: err.field,
        value: edge.attributes[err.field],
        error: err.message,
        constraint: 'validation'
      }))
    }))

    const recommendations: string[] = []
    
    if (invalidEntities.length > 0) {
      recommendations.push(`Fix validation errors in ${invalidEntities.length} entities`)
    }
    if (invalidEdges.length > 0) {
      recommendations.push(`Fix validation errors in ${invalidEdges.length} edges`)
    }
    if (testDataSet.entities.length === 0) {
      recommendations.push('Add test entities to validate your schema')
    }
    if (testDataSet.edges.length === 0 && testDataSet.entities.length > 1) {
      recommendations.push('Consider adding edges to test relationships')
    }
    if (testDataSet.sampleTexts.length === 0) {
      recommendations.push('Generate sample texts for extraction testing')
    }

    return {
      testSetId: testDataSet.id,
      timestamp: new Date(),
      summary: {
        totalEntities: testDataSet.entities.length,
        validEntities: validEntities.length,
        invalidEntities: invalidEntities.length,
        totalEdges: testDataSet.edges.length,
        validEdges: validEdges.length,
        invalidEdges: invalidEdges.length
      },
      entityValidation,
      edgeValidation,
      recommendations
    }
  }

  const report = generateReport()
  const validationRate = report.summary.totalEntities > 0
    ? (report.summary.validEntities / report.summary.totalEntities) * 100
    : 0

  const downloadReport = () => {
    const reportContent = JSON.stringify(report, null, 2)
    const blob = new Blob([reportContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation-report-${testDataSet.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (status: 'passed' | 'failed' | 'partial') => {
    const variants = {
      passed: 'default' as const,
      failed: 'destructive' as const,
      partial: 'secondary' as const
    }
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Validation Report
            </CardTitle>
            <CardDescription>
              Test dataset validation results and recommendations
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(testDataSet.metadata.validationStatus)}
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Entities</span>
              <span className="text-sm text-muted-foreground">
                {report.summary.validEntities}/{report.summary.totalEntities} valid
              </span>
            </div>
            <Progress value={validationRate} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Edges</span>
              <span className="text-sm text-muted-foreground">
                {report.summary.validEdges}/{report.summary.totalEdges} valid
              </span>
            </div>
            <Progress 
              value={report.summary.totalEdges > 0 
                ? (report.summary.validEdges / report.summary.totalEdges) * 100 
                : 0} 
              className="h-2" 
            />
          </div>
        </div>

        {/* Validation Details */}
        <div className="space-y-4">
          <h3 className="font-medium">Validation Details</h3>
          
          {report.entityValidation.filter(e => !e.isValid).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-500">Entity Errors</h4>
              {report.entityValidation
                .filter(e => !e.isValid)
                .map(entity => (
                  <div key={entity.entityId} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(entity.isValid)}
                      <span className="font-medium">{entity.entityType}</span>
                      <span className="text-sm text-muted-foreground">({entity.entityId})</span>
                    </div>
                    {entity.errors.map((error, i) => (
                      <div key={i} className="ml-6 text-sm text-red-500">
                        • {error.field}: {error.error}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
          
          {report.edgeValidation.filter(e => !e.isValid).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-500">Edge Errors</h4>
              {report.edgeValidation
                .filter(e => !e.isValid)
                .map(edge => (
                  <div key={edge.edgeId} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(edge.isValid)}
                      <span className="font-medium">{edge.edgeType}</span>
                      <span className="text-sm text-muted-foreground">({edge.edgeId})</span>
                    </div>
                    {edge.errors.map((error, i) => (
                      <div key={i} className="ml-6 text-sm text-red-500">
                        • {error.field}: {error.error}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Recommendations</div>
              <ul className="list-disc list-inside space-y-1">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm">{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {report.summary.invalidEntities === 0 && report.summary.invalidEdges === 0 && 
         report.summary.totalEntities > 0 && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              All test data is valid! Your schema definitions are working correctly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}