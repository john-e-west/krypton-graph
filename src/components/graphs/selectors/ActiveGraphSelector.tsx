import React, { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useActiveGraph } from '../context/ActiveGraphContext'
import { graphService } from '@/lib/airtable/services'
import { KnowledgeGraph } from '@/types/graph'

export function ActiveGraphSelector() {
  const [open, setOpen] = useState(false)
  const [graphs, setGraphs] = useState<KnowledgeGraph[]>([])
  const [loading, setLoading] = useState(true)
  const { activeGraph, setActiveGraph } = useActiveGraph()

  useEffect(() => {
    loadGraphs()
  }, [])

  const loadGraphs = async () => {
    setLoading(true)
    try {
      const records = await graphService.getActiveGraphs()
      const transformedGraphs = records.map(record => 
        graphService.transformToKnowledgeGraph(record)
      )
      setGraphs(transformedGraphs)
      
      // Set the first graph as active if none is selected
      if (!activeGraph && transformedGraphs.length > 0) {
        const defaultGraph = transformedGraphs.find(g => g.settings.isActive) || transformedGraphs[0]
        setActiveGraph(defaultGraph)
      }
    } catch (error) {
      console.error('Failed to load graphs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGraph = async (graph: KnowledgeGraph) => {
    try {
      await graphService.setActiveGraph(graph.id)
      setActiveGraph(graph)
      setOpen(false)
    } catch (error) {
      console.error('Failed to set active graph:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Loading graphs...</span>
      </div>
    )
  }

  if (graphs.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">No graphs available</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Active Graph:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between"
          >
            {activeGraph ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{activeGraph.name}</span>
                {activeGraph.status === 'processing' && (
                  <Badge variant="secondary" className="text-xs">Processing</Badge>
                )}
              </div>
            ) : (
              "Select a graph..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder="Search graphs..." />
            <CommandEmpty>No graph found.</CommandEmpty>
            <CommandGroup>
              {graphs.map((graph) => (
                <CommandItem
                  key={graph.id}
                  value={graph.name}
                  onSelect={() => handleSelectGraph(graph)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeGraph?.id === graph.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{graph.name}</span>
                      {graph.status === 'processing' && (
                        <Badge variant="secondary" className="text-xs">Processing</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {graph.statistics.entityCount} entities, {graph.statistics.edgeCount} edges
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}