import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { MoreHorizontal, Edit, Copy, Trash, Download, Eye, PlayCircle, Archive } from 'lucide-react'
import { OntologyRecord, OntologyStatus } from '../../lib/types/airtable'
import { EditOntologyDialog } from './dialogs/EditOntologyDialog'
import { DeleteOntologyDialog } from './dialogs/DeleteOntologyDialog'
import { CloneOntologyDialog } from './dialogs/CloneOntologyDialog'
import { ExportDialog } from './dialogs/ExportDialog'
import { Skeleton } from '../ui/skeleton'

interface OntologyTableProps {
  ontologies: OntologyRecord[]
  loading: boolean
  onUpdate: () => void
  onDelete: () => void
}

export const OntologyTable: React.FC<OntologyTableProps> = ({
  ontologies,
  loading,
  onUpdate,
  onDelete
}) => {
  const [selectedOntology, setSelectedOntology] = useState<OntologyRecord | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  const getStatusBadgeVariant = (status?: OntologyStatus) => {
    switch (status) {
      case 'Draft':
        return 'secondary'
      case 'Testing':
        return 'outline'
      case 'Published':
        return 'default'
      case 'Deprecated':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getDomainBadgeColor = (domain?: string) => {
    const colors: Record<string, string> = {
      Healthcare: 'bg-green-100 text-green-800',
      Finance: 'bg-blue-100 text-blue-800',
      Legal: 'bg-purple-100 text-purple-800',
      Technology: 'bg-cyan-100 text-cyan-800',
      Education: 'bg-yellow-100 text-yellow-800',
      Manufacturing: 'bg-gray-100 text-gray-800'
    }
    return domain ? colors[domain] || 'bg-gray-100 text-gray-800' : ''
  }

  const handleAction = (action: string, ontology: OntologyRecord) => {
    setSelectedOntology(ontology)
    
    switch (action) {
      case 'edit':
        setShowEditDialog(true)
        break
      case 'clone':
        setShowCloneDialog(true)
        break
      case 'delete':
        setShowDeleteDialog(true)
        break
      case 'export':
        setShowExportDialog(true)
        break
      case 'view':
        // Navigate to details page
        window.location.href = `/ontologies/${ontology.id}`
        break
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Entities</TableHead>
              <TableHead>Edges</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map(i => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (ontologies.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          No ontologies found. Create your first ontology to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Entities</TableHead>
              <TableHead>Edges</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ontologies.map((ontology) => (
              <TableRow key={ontology.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{ontology.fields.Name}</div>
                    {ontology.fields.Description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {ontology.fields.Description.substring(0, 50)}
                        {ontology.fields.Description.length > 50 && '...'}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {ontology.fields.Domain && (
                    <Badge className={getDomainBadgeColor(ontology.fields.Domain)}>
                      {ontology.fields.Domain}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(ontology.fields.Status)}>
                    {ontology.fields.Status || 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {ontology.fields.Version || '1.0.0'}
                  </span>
                </TableCell>
                <TableCell>
                  {ontology.fields.EntityDefinitions?.length || 0}
                </TableCell>
                <TableCell>
                  {ontology.fields.EdgeDefinitions?.length || 0}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(ontology.fields['Created Date'])}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAction('view', ontology)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('edit', ontology)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('clone', ontology)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('export', ontology)}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </DropdownMenuItem>
                      {ontology.fields.Status === 'Draft' && (
                        <DropdownMenuItem>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Test
                        </DropdownMenuItem>
                      )}
                      {ontology.fields.Status === 'Published' && (
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" />
                          Deprecate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleAction('delete', ontology)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      {selectedOntology && (
        <>
          <EditOntologyDialog
            ontology={selectedOntology}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={() => {
              setShowEditDialog(false)
              onUpdate()
            }}
          />
          
          <DeleteOntologyDialog
            ontology={selectedOntology}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onSuccess={() => {
              setShowDeleteDialog(false)
              onDelete()
            }}
          />
          
          <CloneOntologyDialog
            ontology={selectedOntology}
            open={showCloneDialog}
            onOpenChange={setShowCloneDialog}
            onSuccess={() => {
              setShowCloneDialog(false)
              onUpdate()
            }}
          />
          
          <ExportDialog
            ontology={selectedOntology}
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
          />
        </>
      )}
    </>
  )
}