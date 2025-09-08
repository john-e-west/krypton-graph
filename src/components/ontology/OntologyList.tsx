import React, { useState, useEffect } from 'react'
import { OntologyTable } from './OntologyTable'
import { NewOntologyDialog } from './dialogs/NewOntologyDialog'
import { OntologySearchBar } from './filters/OntologySearchBar'
import { Button } from '../ui/button'
import { Plus, Upload } from 'lucide-react'
import { OntologyRecord, OntologyStatus, Domain } from '../../lib/types/airtable'
import { ontologyService } from '../../lib/airtable/services'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { ImportOntologyDialog } from './dialogs/ImportOntologyDialog'

interface OntologyFilters {
  searchTerm?: string
  status?: 'all' | OntologyStatus
  domain?: 'all' | Domain
}

export const OntologyList: React.FC = () => {
  const [ontologies, setOntologies] = useState<OntologyRecord[]>([])
  const [filteredOntologies, setFilteredOntologies] = useState<OntologyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [filters, setFilters] = useState<OntologyFilters>({
    searchTerm: '',
    status: 'all',
    domain: 'all'
  })

  // Using singleton service from services index

  const loadOntologies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ontologyService.findAll()
      setOntologies(data)
      setFilteredOntologies(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ontologies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOntologies()
  }, [])

  useEffect(() => {
    let filtered = [...ontologies]

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(o => 
        o.fields.Name?.toLowerCase().includes(searchLower) ||
        o.fields.Description?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(o => o.fields.Status === filters.status)
    }

    // Apply domain filter
    if (filters.domain !== 'all') {
      filtered = filtered.filter(o => o.fields.Domain === filters.domain)
    }

    setFilteredOntologies(filtered)
  }, [filters, ontologies])

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }))
  }

  const handleStatusFilter = (status: 'all' | OntologyStatus) => {
    setFilters(prev => ({ ...prev, status }))
  }


  const handleOntologyCreated = () => {
    setShowNewDialog(false)
    loadOntologies()
  }

  const handleOntologyImported = () => {
    setShowImportDialog(false)
    loadOntologies()
  }

  const handleOntologyUpdated = () => {
    loadOntologies()
  }

  const handleOntologyDeleted = () => {
    loadOntologies()
  }

  const getStatsCounts = () => {
    const stats = {
      total: ontologies.length,
      draft: ontologies.filter(o => o.fields.Status === 'Draft').length,
      testing: ontologies.filter(o => o.fields.Status === 'Testing').length,
      published: ontologies.filter(o => o.fields.Status === 'Published').length,
      deprecated: ontologies.filter(o => o.fields.Status === 'Deprecated').length
    }
    return stats
  }

  const stats = getStatsCounts()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ontologies</h2>
          <p className="text-muted-foreground">
            Manage your knowledge domain schemas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Ontology
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          <div className="text-sm text-muted-foreground">Draft</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-blue-600">{stats.testing}</div>
          <div className="text-sm text-muted-foreground">Testing</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          <div className="text-sm text-muted-foreground">Published</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-gray-600">{stats.deprecated}</div>
          <div className="text-sm text-muted-foreground">Deprecated</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <OntologySearchBar onSearch={handleSearch} />
        
        <Tabs value={filters.status} onValueChange={(value) => handleStatusFilter(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Draft">Draft</TabsTrigger>
            <TabsTrigger value="Testing">Testing</TabsTrigger>
            <TabsTrigger value="Published">Published</TabsTrigger>
            <TabsTrigger value="Deprecated">Deprecated</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <OntologyTable
        ontologies={filteredOntologies}
        loading={loading}
        onUpdate={handleOntologyUpdated}
        onDelete={handleOntologyDeleted}
      />

      {/* Dialogs */}
      <NewOntologyDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={handleOntologyCreated}
      />
      
      <ImportOntologyDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={handleOntologyImported}
      />
    </div>
  )
}