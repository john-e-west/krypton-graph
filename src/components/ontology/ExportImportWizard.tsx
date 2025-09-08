'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Download, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X,
  Info,
  FileJson,
  FileCode,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'export' | 'import'
  availableOntologies?: Array<{
    id: string
    name: string
    description: string
    category: string
    entityCount: number
    edgeCount: number
  }>
  onImportComplete?: (results: any) => void
  onExportComplete?: (blob: Blob, filename: string) => void
}

interface ExportOptions {
  selectedOntologies: string[]
  format: 'json' | 'yaml' | 'turtle' | 'owl'
  includeMetadata: boolean
  includeUsageStats: boolean
  compressOutput: boolean
}

interface ImportOptions {
  source: 'file' | 'url'
  format?: 'json' | 'yaml' | 'turtle' | 'owl'
  overwriteExisting: boolean
  createBackup: boolean
  validateStructure: boolean
  assignToCategory?: string
  makePublic: boolean
  addTags: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  ontologyCount: number
  entityTypeCount: number
  edgeTypeCount: number
}

export function ExportImportWizard({
  open,
  onOpenChange,
  mode,
  availableOntologies = [],
  onImportComplete,
  onExportComplete
}: ExportImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    selectedOntologies: [],
    format: 'json',
    includeMetadata: true,
    includeUsageStats: false,
    compressOutput: false
  })
  
  // Import state
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    source: 'file',
    overwriteExisting: false,
    createBackup: true,
    validateStructure: true,
    makePublic: false,
    addTags: []
  })
  
  const [importData, setImportData] = useState<string>('')
  const [importUrl, setImportUrl] = useState<string>('')
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [importResults, setImportResults] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetWizard = useCallback(() => {
    setCurrentStep(1)
    setLoading(false)
    setError(null)
    setProgress(0)
    setImportData('')
    setImportUrl('')
    setValidationResults([])
    setImportResults(null)
    setExportOptions({
      selectedOntologies: [],
      format: 'json',
      includeMetadata: true,
      includeUsageStats: false,
      compressOutput: false
    })
    setImportOptions({
      source: 'file',
      overwriteExisting: false,
      createBackup: true,
      validateStructure: true,
      makePublic: false,
      addTags: []
    })
  }, [])

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetWizard, 300) // Reset after dialog closes
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
      
      // Auto-detect format based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension === 'json') {
        setImportOptions(prev => ({ ...prev, format: 'json' }))
      } else if (extension === 'yaml' || extension === 'yml') {
        setImportOptions(prev => ({ ...prev, format: 'yaml' }))
      } else if (extension === 'ttl' || extension === 'turtle') {
        setImportOptions(prev => ({ ...prev, format: 'turtle' }))
      } else if (extension === 'owl' || extension === 'xml') {
        setImportOptions(prev => ({ ...prev, format: 'owl' }))
      }
    }
    reader.readAsText(file)
  }

  const handleExport = async () => {
    if (exportOptions.selectedOntologies.length === 0) {
      setError('Please select at least one ontology to export')
      return
    }

    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(25)
      
      const response = await fetch('/api/ontologies/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ontologyIds: exportOptions.selectedOntologies,
          format: exportOptions.format,
          includeMetadata: exportOptions.includeMetadata,
          includeUsageStats: exportOptions.includeUsageStats,
          compressOutput: exportOptions.compressOutput
        })
      })

      setProgress(75)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      const blob = await response.blob()
      const filename = response.headers.get('Content-Disposition')
        ?.split('filename=')[1]?.replace(/"/g, '') || 'ontologies-export'

      setProgress(100)

      if (onExportComplete) {
        onExportComplete(blob, filename)
      } else {
        // Download directly
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      setCurrentStep(3) // Success step

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (importOptions.source === 'file' && !importData) {
      setError('Please upload a file or paste ontology data')
      return
    }

    if (importOptions.source === 'url' && !importUrl) {
      setError('Please provide a URL to import from')
      return
    }

    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(25)

      let dataToImport = importData
      if (importOptions.source === 'url') {
        // Fetch data from URL
        const urlResponse = await fetch(importUrl)
        if (!urlResponse.ok) {
          throw new Error(`Failed to fetch from URL: ${urlResponse.statusText}`)
        }
        dataToImport = await urlResponse.text()
      }

      setProgress(50)

      const response = await fetch('/api/ontologies/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: importOptions.source,
          data: dataToImport,
          format: importOptions.format,
          options: {
            overwriteExisting: importOptions.overwriteExisting,
            createBackup: importOptions.createBackup,
            validateStructure: importOptions.validateStructure,
            assignToCategory: importOptions.assignToCategory,
            makePublic: importOptions.makePublic,
            addTags: importOptions.addTags
          }
        })
      })

      setProgress(75)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setProgress(100)
      setImportResults(result)
      setValidationResults(result.results.validationResults || [])
      
      if (onImportComplete) {
        onImportComplete(result)
      }

      setCurrentStep(3) // Success step

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = (step: number) => {
    if (mode === 'export') {
      switch (step) {
        case 1: return 'Select Ontologies'
        case 2: return 'Export Options'
        case 3: return 'Export Complete'
        default: return ''
      }
    } else {
      switch (step) {
        case 1: return 'Import Source'
        case 2: return 'Import Options'
        case 3: return 'Import Complete'
        default: return ''
      }
    }
  }

  const canProceedToNextStep = () => {
    if (mode === 'export') {
      return currentStep === 1 ? exportOptions.selectedOntologies.length > 0 : true
    } else {
      return currentStep === 1 ? (
        importOptions.source === 'file' ? importData.length > 0 : importUrl.length > 0
      ) : true
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {mode === 'export' ? (
              <>
                <Download className="h-5 w-5" />
                <span>Export Ontologies</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Import Ontologies</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  currentStep === step 
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step 
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                )}>
                  {currentStep > step ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {getStepTitle(step)}
                </span>
                {step < 3 && (
                  <div className="mx-4 w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {mode === 'export' ? 'Exporting ontologies...' : 'Importing ontologies...'}
              </p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {currentStep === 1 && mode === 'export' && (
            <Card>
              <CardHeader>
                <CardTitle>Select Ontologies to Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                  {availableOntologies.map((ontology) => (
                    <div key={ontology.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        checked={exportOptions.selectedOntologies.includes(ontology.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExportOptions(prev => ({
                              ...prev,
                              selectedOntologies: [...prev.selectedOntologies, ontology.id]
                            }))
                          } else {
                            setExportOptions(prev => ({
                              ...prev,
                              selectedOntologies: prev.selectedOntologies.filter(id => id !== ontology.id)
                            }))
                          }
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{ontology.name}</h4>
                        <p className="text-sm text-muted-foreground">{ontology.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary">{ontology.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {ontology.entityCount} entities • {ontology.edgeCount} edges
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {availableOntologies.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No ontologies available for export
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && mode === 'import' && (
            <Card>
              <CardHeader>
                <CardTitle>Import Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={importOptions.source} onValueChange={(value: 'file' | 'url') => 
                  setImportOptions(prev => ({ ...prev, source: value }))}>
                  <TabsList>
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="url">From URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="file" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Ontology File</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.yaml,.yml,.ttl,.turtle,.owl,.xml"
                        onChange={handleFileUpload}
                      />
                      <p className="text-sm text-muted-foreground">
                        Supported formats: JSON, YAML, Turtle, OWL/XML
                      </p>
                    </div>
                    
                    {importData && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <Textarea
                          value={importData.substring(0, 500) + (importData.length > 500 ? '...' : '')}
                          readOnly
                          className="h-32"
                        />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ontology URL</Label>
                      <Input
                        placeholder="https://example.com/ontology.json"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        URL to a publicly accessible ontology file
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && mode === 'export' && (
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select 
                      value={exportOptions.format} 
                      onValueChange={(value: 'json' | 'yaml' | 'turtle' | 'owl') => 
                        setExportOptions(prev => ({ ...prev, format: value }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">
                          <div className="flex items-center space-x-2">
                            <FileJson className="h-4 w-4" />
                            <span>JSON</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="yaml">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>YAML</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="turtle">
                          <div className="flex items-center space-x-2">
                            <FileCode className="h-4 w-4" />
                            <span>Turtle</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="owl">
                          <div className="flex items-center space-x-2">
                            <FileCode className="h-4 w-4" />
                            <span>OWL/XML</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={exportOptions.includeMetadata}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeMetadata: checked as boolean }))
                      }
                    />
                    <Label>Include metadata (creation date, author, ratings)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={exportOptions.includeUsageStats}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeUsageStats: checked as boolean }))
                      }
                    />
                    <Label>Include usage statistics</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={exportOptions.compressOutput}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, compressOutput: checked as boolean }))
                      }
                    />
                    <Label>Compress output (recommended for large exports)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && mode === 'import' && (
            <Card>
              <CardHeader>
                <CardTitle>Import Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format (optional)</Label>
                    <Select 
                      value={importOptions.format || 'auto'} 
                      onValueChange={(value) => 
                        setImportOptions(prev => ({ 
                          ...prev, 
                          format: value === 'auto' ? undefined : value as any 
                        }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="yaml">YAML</SelectItem>
                        <SelectItem value="turtle">Turtle</SelectItem>
                        <SelectItem value="owl">OWL/XML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category (optional)</Label>
                    <Input
                      placeholder="e.g., imported, external"
                      value={importOptions.assignToCategory || ''}
                      onChange={(e) => setImportOptions(prev => ({ 
                        ...prev, 
                        assignToCategory: e.target.value || undefined 
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={importOptions.validateStructure}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, validateStructure: checked as boolean }))
                      }
                    />
                    <Label>Validate ontology structure</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={importOptions.overwriteExisting}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, overwriteExisting: checked as boolean }))
                      }
                    />
                    <Label>Overwrite existing ontologies with same name</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={importOptions.createBackup}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, createBackup: checked as boolean }))
                      }
                    />
                    <Label>Create backup before overwriting</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={importOptions.makePublic}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, makePublic: checked as boolean }))
                      }
                    />
                    <Label>Make imported ontologies public</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Tags</Label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    value={importOptions.addTags.join(', ')}
                    onChange={(e) => setImportOptions(prev => ({ 
                      ...prev, 
                      addTags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated tags to add to all imported ontologies
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{mode === 'export' ? 'Export Complete' : 'Import Complete'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'export' && (
                  <Alert>
                    <Download className="h-4 w-4" />
                    <AlertDescription>
                      Your ontologies have been successfully exported. The download should begin automatically.
                    </AlertDescription>
                  </Alert>
                )}

                {mode === 'import' && importResults && (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {importResults.message}
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {importResults.summary.totalImported}
                        </div>
                        <div className="text-sm text-muted-foreground">Imported</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-500">
                          {importResults.summary.totalSkipped}
                        </div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {importResults.summary.totalParsed}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Parsed</div>
                      </div>
                    </div>

                    {validationResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Validation Results</h4>
                        {validationResults.map((result, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              {result.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium">
                                Ontology {index + 1} - {result.isValid ? 'Valid' : 'Invalid'}
                              </span>
                            </div>
                            
                            {result.errors.length > 0 && (
                              <div className="text-sm text-red-600">
                                <strong>Errors:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {result.errors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {result.warnings.length > 0 && (
                              <div className="text-sm text-yellow-600 mt-2">
                                <strong>Warnings:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {result.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <div className="flex space-x-2">
              {currentStep > 1 && currentStep < 3 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={loading}
                >
                  Back
                </Button>
              )}

              {currentStep < 2 && (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceedToNextStep() || loading}
                >
                  Next
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  onClick={mode === 'export' ? handleExport : handleImport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {mode === 'export' ? 'Exporting...' : 'Importing...'}
                    </>
                  ) : (
                    <>
                      {mode === 'export' ? (
                        <Download className="h-4 w-4 mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {mode === 'export' ? 'Export' : 'Import'}
                    </>
                  )}
                </Button>
              )}

              {currentStep === 3 && (
                <Button onClick={handleClose}>
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}