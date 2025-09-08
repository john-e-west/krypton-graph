import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ImpactReport } from '../../types/review'
import { AlertTriangle, Info, CheckCircle, XCircle, Plus, Edit, Trash } from 'lucide-react'

interface ImpactVisualizationProps {
  report: ImpactReport
}

export function ImpactVisualization({ report }: ImpactVisualizationProps) {
  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-amber-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getRiskLevelIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5" />
      case 'medium': return <AlertTriangle className="h-5 w-5" />
      case 'high': return <XCircle className="h-5 w-5" />
      default: return <Info className="h-5 w-5" />
    }
  }

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Impact Summary
            <div className={`flex items-center gap-2 ${getRiskLevelColor(report.summary.riskLevel)}`}>
              {getRiskLevelIcon(report.summary.riskLevel)}
              <span className="text-lg font-semibold">
                {report.summary.riskLevel.toUpperCase()} RISK
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.totalChanges}</p>
              <p className="text-sm text-muted-foreground">Total Changes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.entitiesAffected}</p>
              <p className="text-sm text-muted-foreground">Entities Affected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{report.summary.edgesAffected}</p>
              <p className="text-sm text-muted-foreground">Edges Affected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Change Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-500" />
                <span>Added</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {report.details.added.length} items
                </span>
                <Badge variant="outline">
                  {calculatePercentage(report.details.added.length, report.summary.totalChanges)}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={calculatePercentage(report.details.added.length, report.summary.totalChanges)} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-blue-500" />
                <span>Modified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {report.details.modified.length} items
                </span>
                <Badge variant="outline">
                  {calculatePercentage(report.details.modified.length, report.summary.totalChanges)}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={calculatePercentage(report.details.modified.length, report.summary.totalChanges)} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash className="h-4 w-4 text-red-500" />
                <span>Removed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {report.details.removed.length} items
                </span>
                <Badge variant="outline">
                  {calculatePercentage(report.details.removed.length, report.summary.totalChanges)}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={calculatePercentage(report.details.removed.length, report.summary.totalChanges)} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {report.warnings && report.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {report.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Recommendations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {report.recommendations.map((recommendation, idx) => (
                <li key={idx} className="text-sm">{recommendation}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.details.added.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-500" />
                  Added Items ({report.details.added.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {report.details.added.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground pl-6">
                      {item.type}: {item.data?.id || item.data?.name || 'Unknown'}
                    </div>
                  ))}
                  {report.details.added.length > 10 && (
                    <div className="text-sm text-muted-foreground pl-6">
                      ...and {report.details.added.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {report.details.modified.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-500" />
                  Modified Items ({report.details.modified.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {report.details.modified.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground pl-6">
                      {item.type}: {item.data?.id || item.data?.name || 'Unknown'}
                    </div>
                  ))}
                  {report.details.modified.length > 10 && (
                    <div className="text-sm text-muted-foreground pl-6">
                      ...and {report.details.modified.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {report.details.removed.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Trash className="h-4 w-4 text-red-500" />
                  Removed Items ({report.details.removed.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {report.details.removed.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground pl-6">
                      {item.type}: {item.data?.id || item.data?.name || 'Unknown'}
                    </div>
                  ))}
                  {report.details.removed.length > 10 && (
                    <div className="text-sm text-muted-foreground pl-6">
                      ...and {report.details.removed.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}