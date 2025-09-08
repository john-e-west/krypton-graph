import React, { useState, useEffect } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Archive, RefreshCw, Settings, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { graphService } from '@/lib/airtable/services'
import { KnowledgeGraph } from '@/types/graph'
import { useActiveGraph } from './context/ActiveGraphContext'
import { format } from 'date-fns'

interface GraphListProps {
  onEdit: (graph: KnowledgeGraph) => void
  onExport: (graph: KnowledgeGraph) => void
  showArchived?: boolean
}

export function GraphList({ onEdit, onExport, showArchived = false }: GraphListProps) {
  const [graphs, setGraphs] = useState<KnowledgeGraph[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const { activeGraph, setActiveGraph } = useActiveGraph()

  useEffect(() => {
    loadGraphs()
  }, [showArchived])

  const loadGraphs = async () => {
    setLoading(true)
    try {
      const records = showArchived 
        ? await graphService.getArchivedGraphs()
        : await graphService.getActiveGraphs()
      
      const transformedGraphs = records.map(record => 
        graphService.transformToKnowledgeGraph(record)
      )
      setGraphs(transformedGraphs)
    } catch (error) {
      console.error('Failed to load graphs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetActive = async (graph: KnowledgeGraph) => {
    try {
      await graphService.setActiveGraph(graph.id)
      setActiveGraph(graph)
      await loadGraphs()
    } catch (error) {
      console.error('Failed to set active graph:', error)
    }
  }

  const handleArchive = async (graph: KnowledgeGraph) => {
    try {
      await graphService.archiveGraph(graph.id)
      await loadGraphs()
    } catch (error) {
      console.error('Failed to archive graph:', error)
    }
  }

  const handleRestore = async (graph: KnowledgeGraph) => {
    try {
      await graphService.restoreGraph(graph.id)
      await loadGraphs()
    } catch (error) {
      console.error('Failed to restore graph:', error)
    }
  }

  const columns: ColumnDef<KnowledgeGraph>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const graph = row.original
        return (
          <div className="flex items-center gap-2">
            {graph.name}
            {activeGraph?.id === graph.id && (
              <Badge variant="default" className="text-xs">Active</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate">{row.original.description}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const variant = status === 'active' ? 'default' : 
                       status === 'archived' ? 'secondary' : 'outline'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      id: 'statistics',
      header: 'Statistics',
      cell: ({ row }) => {
        const stats = row.original.statistics
        return (
          <div className="text-sm text-muted-foreground">
            {stats.entityCount} entities, {stats.edgeCount} edges
          </div>
        )
      },
    },
    {
      accessorKey: 'metadata.updatedAt',
      header: 'Last Modified',
      cell: ({ row }) => {
        const date = row.original.metadata.updatedAt
        return format(date, 'MMM d, yyyy')
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const graph = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {!showArchived && (
                <>
                  <DropdownMenuItem onClick={() => handleSetActive(graph)}>
                    Set as Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(graph)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onExport(graph)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(graph)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              {showArchived && (
                <DropdownMenuItem onClick={() => handleRestore(graph)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: graphs,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (loading) {
    return <div className="text-center py-4">Loading graphs...</div>
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter graphs..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No graphs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}