import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { ValidationResult } from '@/types/ontology'

interface ValidationPanelProps {
  validation: ValidationResult
}

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Validation Errors</div>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm">
                  <span className="font-mono">{error.field}</span>: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Warnings</div>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="text-sm">
                  <span className="font-mono">{warning.field}</span>: {warning.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}