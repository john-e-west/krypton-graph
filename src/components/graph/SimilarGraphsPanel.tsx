import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  TrendingUp, 
  Users, 
  Eye,
  Copy,
  GitMerge,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface TypeDefinition {
  id: string
  name: string
  description: string
  pattern?: string
  attributes?: Array<{
    name: string
    type: string
    required: boolean
  }>
}

interface EdgeTypeDefinition {
  id: string
  name: string
  description: string
  sourceTypes: string[]
  targetTypes: string[]
  pattern?: string
}

interface OntologyDefinition {
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  domain?: string
  tags?: string[]
}

interface SimilarGraph {
  graph: {
    id: string
    name: string
    description: string
    domain?: string
    tags?: string[]
    usage_count?: number
    success_rate?: number
    created_at?: string
    last_used?: string
  }
  scores: {
    overall: number
    entity_similarity: number
    edge_similarity: number
    domain_match: number
    tag_overlap: number
    usage_factor: number
  }
  reasoning: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface SimilarGraphsPanelProps {
  ontology: OntologyDefinition
  onViewGraph?: (graphId: string) => void
  onCloneGraph?: (graphId: string) => void
  onMergeGraph?: (graphId: string) => void
  className?: string
}

const SimilarGraphsPanel: React.FC<SimilarGraphsPanelProps> = ({
  ontology,
  onViewGraph,
  onCloneGraph,
  onMergeGraph,
  className = ''
}) => {
  const [similarGraphs, setSimilarGraphs] = useState<SimilarGraph[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState<number>(0)
  const [expandedGraphs, setExpandedGraphs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (ontology.entityTypes.length > 0) {
      searchSimilarGraphs()
    }
  }, [ontology, searchSimilarGraphs])

  const searchSimilarGraphs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ontologies/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ontology,
          options: {
            max_results: 10,
            include_low_confidence: false,
            weight_usage: true
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to search for similar graphs')
      }

      const data = await response.json()
      setSimilarGraphs(data.matches)
      setSearchTime(data.search_time_ms)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [ontology])

  const toggleExpanded = (graphId: string) => {
    const newExpanded = new Set(expandedGraphs)
    if (newExpanded.has(graphId)) {
      newExpanded.delete(graphId)
    } else {
      newExpanded.add(graphId)
    }
    setExpandedGraphs(newExpanded)
  }


  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'low': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString()
  }

  const renderGraphCard = (match: SimilarGraph) => {
    const isExpanded = expandedGraphs.has(match.graph.id)

    return (
      <Card key={match.graph.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{match.graph.name}</CardTitle>
                <div className="flex items-center gap-1">
                  {getConfidenceIcon(match.confidence)}
                  <Badge variant={match.confidence === 'high' ? 'default' : 'secondary'}>
                    {Math.round(match.scores.overall * 100)}% match
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-sm">
                {match.graph.description}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(match.graph.id)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Quick info row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            {match.graph.usage_count && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{match.graph.usage_count} uses</span>
              </div>
            )}
            {match.graph.success_rate && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{Math.round(match.graph.success_rate * 100)}% success</span>
              </div>
            )}
            {match.graph.last_used && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Used {formatDate(match.graph.last_used)}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Tags and Domain */}
          <div className="flex flex-wrap gap-2 mb-3">
            {match.graph.domain && (
              <Badge variant="outline" className="text-xs">
                {match.graph.domain}
              </Badge>
            )}
            {match.graph.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Similarity breakdown */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span>Entity Types</span>
              <span className="text-muted-foreground">
                {Math.round(match.scores.entity_similarity * 100)}%
              </span>
            </div>
            <Progress value={match.scores.entity_similarity * 100} className="h-1" />

            <div className="flex items-center justify-between text-sm">
              <span>Relationships</span>
              <span className="text-muted-foreground">
                {Math.round(match.scores.edge_similarity * 100)}%
              </span>
            </div>
            <Progress value={match.scores.edge_similarity * 100} className="h-1" />

            {match.scores.domain_match > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>Domain Match</span>
                  <span className="text-muted-foreground">
                    {Math.round(match.scores.domain_match * 100)}%
                  </span>
                </div>
                <Progress value={match.scores.domain_match * 100} className="h-1" />
              </>
            )}
          </div>

          {/* Reasoning (always visible for top reasons) */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Why this matches:</p>
            <ul className="space-y-1">
              {match.reasoning.slice(0, isExpanded ? match.reasoning.length : 2).map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {match.reasoning.length > 2 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(match.graph.id)}
                className="text-xs h-auto p-1 mt-1"
              >
                +{match.reasoning.length - 2} more reasons
              </Button>
            )}
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDate(match.graph.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium">Last Used</p>
                  <p className="text-muted-foreground">{formatDate(match.graph.last_used)}</p>
                </div>
              </div>

              {/* Detailed score breakdown */}
              <div>
                <p className="font-medium text-sm mb-2">Detailed Similarity Scores</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tag Overlap:</span>
                    <span>{Math.round(match.scores.tag_overlap * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage Factor:</span>
                    <span>{Math.round(match.scores.usage_factor * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <Separator className="my-4" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewGraph?.(match.graph.id)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCloneGraph?.(match.graph.id)}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMergeGraph?.(match.graph.id)}
              className="flex-1"
            >
              <GitMerge className="h-4 w-4 mr-2" />
              Merge
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (ontology.entityTypes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Similar Graphs
          </CardTitle>
          <CardDescription>
            Add entity types to find similar knowledge graphs
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Similar Graphs
            </CardTitle>
            <CardDescription>
              {isLoading 
                ? 'Searching for similar knowledge graphs...' 
                : `Found ${similarGraphs.length} similar graphs`
              }
              {searchTime > 0 && (
                <span className="text-xs ml-2">({searchTime}ms)</span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={searchSimilarGraphs}
            disabled={isLoading}
          >
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && similarGraphs.length === 0 && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No similar graphs found for your ontology
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your entity and edge types, or create a new pattern
            </p>
          </div>
        )}

        {!isLoading && !error && similarGraphs.length > 0 && (
          <div className="space-y-4">
            {similarGraphs.map(match => renderGraphCard(match))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimilarGraphsPanel