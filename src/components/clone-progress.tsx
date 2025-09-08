import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clone } from "@/services/graph-clone.service"

interface CloneProgressProps {
  clone?: Clone
  isCloning: boolean
  progress: number
}

export function CloneProgress({ clone, isCloning, progress }: CloneProgressProps) {
  if (!isCloning && !clone) {
    return null
  }

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'committed':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Clone Operation</h3>
        {clone && (
          <Badge variant={getStatusBadgeVariant(clone.status)}>
            {clone.status}
          </Badge>
        )}
      </div>

      {isCloning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Cloning graph...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {clone && (
        <Alert>
          <AlertTitle>Clone Information</AlertTitle>
          <AlertDescription>
            <div className="space-y-1 mt-2">
              <div className="text-sm">
                <span className="font-medium">Clone ID:</span> {clone.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Parent Graph:</span> {clone.parentGraphId}
              </div>
              <div className="text-sm">
                <span className="font-medium">Created:</span> {new Date(clone.createdAt).toLocaleString()}
              </div>
              {clone.size && (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Entities:</span> {clone.size.entities}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Edges:</span> {clone.size.edges}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Size:</span> {(clone.size.bytes / 1024).toFixed(2)} KB
                  </div>
                </>
              )}
              {clone.operations && clone.operations.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Operations:</span> {clone.operations.length}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}