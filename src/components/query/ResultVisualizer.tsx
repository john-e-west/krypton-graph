import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Network, Table, Code, Download, Share, FileDown } from 'lucide-react'
import { QueryResult } from '@/types/query'
import { QueryExporter } from '@/lib/query-exporter'

interface ResultVisualizerProps {
  result: QueryResult
}

export const ResultVisualizer: React.FC<ResultVisualizerProps> = ({ result }) => {
  const [viewMode, setViewMode] = useState<'graph' | 'table' | 'json'>('graph')
  const [isExporting, setIsExporting] = useState(false)
  const exporter = new QueryExporter()

  const handleExport = (format: string) => async () => {
    setIsExporting(true)
    try {
      let blob: Blob
      let filename: string
      
      switch (format) {
        case 'csv':
          blob = await exporter.exportCSV(result)
          filename = 'query-results.csv'
          break
        case 'json':
          blob = await exporter.exportJSON(result)
          filename = 'query-results.json'
          break
        case 'graphml':
          blob = await exporter.exportGraphML(result)
          filename = 'query-results.graphml'
          break
        case 'excel':
          blob = await exporter.exportExcel(result)
          filename = 'query-results.xlsx'
          break
        case 'gexf':
          blob = await exporter.exportGEXF(result)
          filename = 'query-results.gexf'
          break
        case 'cypher':
          blob = await exporter.exportCypher(result)
          filename = 'query-results.cypher'
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShareableLink = async () => {
    setIsExporting(true)
    try {
      const link = await exporter.generateShareableLink(result)
      navigator.clipboard.writeText(link)
      // Could show a toast notification here
      console.log('Shareable link copied to clipboard:', link)
    } catch (error) {
      console.error('Failed to generate shareable link:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const renderGraphView = () => {
    return (
      <div className="h-96 border rounded-lg flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <Network className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Graph visualization with {result.entities.length} nodes and {result.edges.length} edges
          </p>
        </div>
      </div>
    )
  }

  const renderTableView = () => {
    const allItems = [
      ...result.entities.map(e => ({ ...e, _type: 'entity' })),
      ...result.edges.map(e => ({ ...e, _type: 'edge' }))
    ]

    if (allItems.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No results to display
        </div>
      )
    }

    const columns = Object.keys(allItems[0] || {})

    return (
      <ScrollArea className="h-96">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              {columns.map(col => (
                <th key={col} className="text-left p-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, index) => (
              <tr key={index} className="border-b">
                {columns.map(col => (
                  <td key={col} className="p-2">
                    {typeof (item as Record<string, unknown>)[col] === 'object' 
                      ? JSON.stringify((item as Record<string, unknown>)[col])
                      : String((item as Record<string, unknown>)[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    )
  }

  const renderJsonView = () => {
    return (
      <ScrollArea className="h-96">
        <pre className="text-sm p-4">
          {JSON.stringify(result, null, 2)}
        </pre>
      </ScrollArea>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              Found {result.entities.length} entities and {result.edges.length} relationships
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {result.metadata.executionTime}ms
            </Badge>
            {result.metadata.cached && (
              <Badge variant="outline">Cached</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Graph
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph">
            {renderGraphView()}
          </TabsContent>

          <TabsContent value="table">
            {renderTableView()}
          </TabsContent>

          <TabsContent value="json">
            {renderJsonView()}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-4">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExport('csv')}
              disabled={isExporting}
            >
              <FileDown className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExport('json')}
              disabled={isExporting}
            >
              <FileDown className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExport('graphml')}
              disabled={isExporting}
            >
              <FileDown className="h-3 w-3 mr-1" />
              GraphML
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExport('excel')}
              disabled={isExporting}
            >
              <FileDown className="h-3 w-3 mr-1" />
              Excel
            </Button>
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleShareableLink}
            disabled={isExporting}
          >
            <Share className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}