import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import type { CSVImportConfig, ColumnMapping, TestEntity } from '@/types/testing'
import type { EntityTypeDefinition, EntityField } from '@/types/ontology'

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: EntityTypeDefinition
  onImport: (entities: TestEntity[]) => void
}

// Security constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit
const MAX_ROWS = 10000 // Maximum number of rows to process
const ALLOWED_MIME_TYPES = ['text/csv', 'application/csv', 'text/plain']

interface ValidationError {
  row: number
  field: string
  value: any
  error: string
}

export default function CSVImportDialog({
  open,
  onOpenChange,
  entityType,
  onImport
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [preview, setPreview] = useState<TestEntity[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importing, setImporting] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    // Security: Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrors([`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`])
      return
    }
    
    // Security: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setErrors(['Invalid file type. Please upload a CSV file.'])
      return
    }
    
    setFile(selectedFile)
    setErrors([])
    setValidationErrors([])
    
    Papa.parse(selectedFile, {
      complete: (result) => {
        if (result.errors.length > 0) {
          setErrors(result.errors.map(e => e.message))
          return
        }
        
        const data = result.data as any[]
        if (data.length === 0) {
          setErrors(['CSV file is empty'])
          return
        }
        
        // Security: Limit number of rows
        if (data.length > MAX_ROWS) {
          setErrors([`File contains ${data.length} rows, which exceeds the maximum of ${MAX_ROWS} rows`])
          return
        }
        
        // Security: Sanitize data
        const sanitizedData = data.map(row => {
          const sanitizedRow: any = {}
          Object.keys(row).forEach(key => {
            // Remove potential script tags and dangerous characters
            const cleanKey = key.replace(/<script[^>]*>.*?<\/script>/gi, '').trim()
            const value = String(row[key] || '').replace(/<script[^>]*>.*?<\/script>/gi, '').trim()
            if (cleanKey) {
              sanitizedRow[cleanKey] = value
            }
          })
          return sanitizedRow
        })
        
        // Extract headers
        const headers = Object.keys(sanitizedData[0])
        setCsvHeaders(headers)
        setCsvData(sanitizedData)
        
        // Initialize mappings
        const initialMappings: ColumnMapping[] = []
        entityType.fields.forEach(field => {
          // Try to auto-map based on field name
          const matchingHeader = headers.find(h => 
            h.toLowerCase() === field.name.toLowerCase() ||
            h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
          
          if (matchingHeader) {
            initialMappings.push({
              csvColumn: matchingHeader,
              entityField: field.name
            })
          }
        })
        
        setMappings(initialMappings)
        generatePreview(sanitizedData, initialMappings)
      },
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8'
    })
  }, [entityType])

  const updateMapping = (entityField: string, csvColumn: string) => {
    const newMappings = [...mappings.filter(m => m.entityField !== entityField)]
    if (csvColumn && csvColumn !== '') {
      newMappings.push({ csvColumn, entityField })
    }
    setMappings(newMappings)
    generatePreview(csvData, newMappings)
  }

  const generatePreview = (data: any[], currentMappings: ColumnMapping[]) => {
    if (data.length === 0 || currentMappings.length === 0) {
      setPreview([])
      return
    }
    
    const previewEntities: TestEntity[] = []
    const previewErrors: ValidationError[] = []
    const maxPreview = Math.min(5, data.length)
    
    for (let i = 0; i < maxPreview; i++) {
      const row = data[i]
      const entityData: Record<string, any> = {}
      const entityErrors: any[] = []
      
      currentMappings.forEach(mapping => {
        const value = row[mapping.csvColumn]
        const field = entityType.fields.find(f => f.name === mapping.entityField)
        
        if (field && value !== undefined && value !== '') {
          try {
            // Type conversion based on field type
            if (typeof field.type === 'string') {
              switch (field.type) {
                case 'int':
                  const intVal = parseInt(value)
                  if (isNaN(intVal)) {
                    previewErrors.push({
                      row: i + 1,
                      field: mapping.entityField,
                      value,
                      error: 'Invalid integer value'
                    })
                  } else {
                    entityData[mapping.entityField] = intVal
                  }
                  break
                case 'float':
                  const floatVal = parseFloat(value)
                  if (isNaN(floatVal)) {
                    previewErrors.push({
                      row: i + 1,
                      field: mapping.entityField,
                      value,
                      error: 'Invalid decimal value'
                    })
                  } else {
                    entityData[mapping.entityField] = floatVal
                  }
                  break
                case 'bool':
                  entityData[mapping.entityField] = 
                    value.toLowerCase() === 'true' || value === '1'
                  break
                case 'datetime':
                  const dateVal = new Date(value)
                  if (isNaN(dateVal.getTime())) {
                    previewErrors.push({
                      row: i + 1,
                      field: mapping.entityField,
                      value,
                      error: 'Invalid date format'
                    })
                  } else {
                    entityData[mapping.entityField] = dateVal.toISOString()
                  }
                  break
                default:
                  entityData[mapping.entityField] = value
              }
            } else {
              entityData[mapping.entityField] = value
            }
          } catch (err) {
            previewErrors.push({
              row: i + 1,
              field: mapping.entityField,
              value,
              error: `Conversion error: ${err}`
            })
          }
        }
      })
      
      previewEntities.push({
        id: `csv-import-${i}`,
        entityTypeId: entityType.id,
        entityTypeName: entityType.name,
        data: entityData,
        validation: { 
          isValid: entityErrors.length === 0, 
          errors: entityErrors 
        },
        metadata: {
          createdAt: new Date(),
          createdBy: 'csv-import',
          isTestData: true
        }
      })
    }
    
    setPreview(previewEntities)
    setValidationErrors(previewErrors)
  }

  const handleImport = async () => {
    if (csvData.length === 0) {
      setErrors(['No data to import'])
      return
    }
    
    setImporting(true)
    setErrors([])
    
    try {
      const entities: TestEntity[] = []
      const importErrors: ValidationError[] = []
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i]
        const entityData: Record<string, any> = {}
        const rowErrors: ValidationError[] = []
        
        // Apply mappings with validation
        mappings.forEach(mapping => {
          const value = row[mapping.csvColumn]
          const field = entityType.fields.find(f => f.name === mapping.entityField)
          
          if (field && value !== undefined && value !== '') {
            try {
              // Type conversion with validation
              if (typeof field.type === 'string') {
                switch (field.type) {
                  case 'int':
                    const intVal = parseInt(value)
                    if (isNaN(intVal)) {
                      rowErrors.push({
                        row: i + 1,
                        field: mapping.entityField,
                        value,
                        error: 'Must be a valid integer'
                      })
                    } else {
                      // Apply constraints if present
                      if (field.constraints) {
                        if (field.constraints.ge !== undefined && intVal < field.constraints.ge) {
                          rowErrors.push({
                            row: i + 1,
                            field: mapping.entityField,
                            value: intVal,
                            error: `Must be >= ${field.constraints.ge}`
                          })
                        }
                        if (field.constraints.le !== undefined && intVal > field.constraints.le) {
                          rowErrors.push({
                            row: i + 1,
                            field: mapping.entityField,
                            value: intVal,
                            error: `Must be <= ${field.constraints.le}`
                          })
                        }
                      }
                      entityData[mapping.entityField] = intVal
                    }
                    break
                  case 'float':
                    const floatVal = parseFloat(value)
                    if (isNaN(floatVal)) {
                      rowErrors.push({
                        row: i + 1,
                        field: mapping.entityField,
                        value,
                        error: 'Must be a valid decimal number'
                      })
                    } else {
                      entityData[mapping.entityField] = floatVal
                    }
                    break
                  case 'bool':
                    entityData[mapping.entityField] = 
                      value.toLowerCase() === 'true' || value === '1'
                    break
                  case 'datetime':
                    const dateVal = new Date(value)
                    if (isNaN(dateVal.getTime())) {
                      rowErrors.push({
                        row: i + 1,
                        field: mapping.entityField,
                        value,
                        error: 'Invalid date format (use YYYY-MM-DD or MM/DD/YYYY)'
                      })
                    } else {
                      entityData[mapping.entityField] = dateVal.toISOString()
                    }
                    break
                  default:
                    // String validation
                    if (field.constraints) {
                      if (field.constraints.minLength && value.length < field.constraints.minLength) {
                        rowErrors.push({
                          row: i + 1,
                          field: mapping.entityField,
                          value,
                          error: `Must be at least ${field.constraints.minLength} characters`
                        })
                      }
                      if (field.constraints.maxLength && value.length > field.constraints.maxLength) {
                        rowErrors.push({
                          row: i + 1,
                          field: mapping.entityField,
                          value,
                          error: `Must be at most ${field.constraints.maxLength} characters`
                        })
                      }
                      if (field.constraints.pattern) {
                        const regex = new RegExp(field.constraints.pattern)
                        if (!regex.test(value)) {
                          rowErrors.push({
                            row: i + 1,
                            field: mapping.entityField,
                            value,
                            error: `Does not match required pattern: ${field.constraints.pattern}`
                          })
                        }
                      }
                    }
                    entityData[mapping.entityField] = value
                }
              } else {
                entityData[mapping.entityField] = value
              }
            } catch (err) {
              rowErrors.push({
                row: i + 1,
                field: mapping.entityField,
                value,
                error: `Processing error: ${err}`
              })
            }
          }
        })
        
        // Validate required fields
        const missingRequired = entityType.fields
          .filter(f => !f.isOptional && !entityData[f.name])
          .map(f => f.name)
        
        if (missingRequired.length > 0) {
          missingRequired.forEach(fieldName => {
            rowErrors.push({
              row: i + 1,
              field: fieldName,
              value: null,
              error: 'Required field is missing'
            })
          })
        }
        
        // Add errors to collection
        if (rowErrors.length > 0) {
          importErrors.push(...rowErrors)
          errorCount++
          continue
        }
        
        entities.push({
          id: `csv-${Date.now()}-${i}`,
          entityTypeId: entityType.id,
          entityTypeName: entityType.name,
          data: entityData,
          validation: { isValid: true, errors: [] },
          metadata: {
            createdAt: new Date(),
            createdBy: 'csv-import',
            isTestData: true
          }
        })
        successCount++
      }
      
      // Update validation errors for display
      setValidationErrors(importErrors)
      
      if (entities.length > 0) {
        // Show summary message
        if (errorCount > 0) {
          setErrors([`Successfully imported ${successCount} entities. ${errorCount} rows had errors (see details below).`])
        }
        onImport(entities)
        if (errorCount === 0) {
          onOpenChange(false)
        }
      } else if (importErrors.length > 0) {
        setErrors([`Import failed: All ${csvData.length} rows had validation errors`])
      }
    } catch (error) {
      setErrors([`Import failed: ${error}`])
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV Data for {entityType.name}</DialogTitle>
          <DialogDescription>
            Upload a CSV file and map columns to entity fields
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </div>
          
          {csvHeaders.length > 0 && (
            <div className="space-y-2">
              <Label>Column Mappings</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Field</TableHead>
                    <TableHead>CSV Column</TableHead>
                    <TableHead>Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entityType.fields.map(field => {
                    const currentMapping = mappings.find(m => m.entityField === field.name)
                    return (
                      <TableRow key={field.name}>
                        <TableCell className="font-medium">{field.name}</TableCell>
                        <TableCell>
                          <Select
                            value={currentMapping?.csvColumn || ''}
                            onValueChange={(value) => updateMapping(field.name, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {csvHeaders.map(header => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {!field.isOptional && (
                            <span className="text-red-500">Required</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first {preview.length} rows)</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(preview[0].data).map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((entity, i) => (
                      <TableRow key={i}>
                        {Object.values(entity.data).map((value, j) => (
                          <TableCell key={j}>
                            {String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {errors.length > 0 && (
            <Alert variant={errors[0].includes('Successfully') ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <Label>Validation Errors</Label>
              <div className="border rounded-lg p-4 max-h-40 overflow-y-auto bg-red-50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationErrors.slice(0, 20).map((error, i) => (
                      <TableRow key={i}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell className="font-medium">{error.field}</TableCell>
                        <TableCell className="text-sm">
                          {error.value === null ? 'empty' : String(error.value).substring(0, 20)}
                        </TableCell>
                        <TableCell className="text-red-600 text-sm">{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {validationErrors.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ...and {validationErrors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || mappings.length === 0 || importing}
          >
            {importing ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {csvData.length} Rows
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}