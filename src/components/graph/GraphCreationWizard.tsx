import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Users, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface GraphCreationWizardProps {
  documentId: string
  documentName: string
  entityTypes: TypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  onCancel: () => void
  onComplete: (graphId: string) => void
}

interface GraphConfiguration {
  name: string
  description: string
  isPrivate: boolean
  allowCollaboration: boolean
  tags: string[]
}

type CreationStep = 'summary' | 'configuration' | 'creating' | 'complete'

const GraphCreationWizard: React.FC<GraphCreationWizardProps> = ({
  documentId,
  documentName,
  entityTypes,
  edgeTypes,
  onCancel,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<CreationStep>('summary')
  const [config, setConfig] = useState<GraphConfiguration>({
    name: `${documentName} Knowledge Graph`,
    description: `Automatically generated knowledge graph from ${documentName}`,
    isPrivate: true,
    allowCollaboration: false,
    tags: []
  })
  const [creationProgress, setCreationProgress] = useState(0)
  const [creationStage, setCreationStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [graphId, setGraphId] = useState<string | null>(null)

  const generateSmartSuggestions = () => {
    const suggestions: string[] = []
    
    // Extract domain from document name
    const name = documentName.toLowerCase()
    if (name.includes('legal') || name.includes('contract')) {
      suggestions.push('Legal Documents', 'Contract Analysis')
    }
    if (name.includes('research') || name.includes('paper')) {
      suggestions.push('Research Analysis', 'Academic Papers')
    }
    if (name.includes('meeting') || name.includes('minutes')) {
      suggestions.push('Meeting Analysis', 'Project Management')
    }
    
    // Based on entity types
    const typeNames = entityTypes.map(t => t.name.toLowerCase())
    if (typeNames.some(n => n.includes('person') || n.includes('individual'))) {
      suggestions.push('People Networks')
    }
    if (typeNames.some(n => n.includes('organization') || n.includes('company'))) {
      suggestions.push('Organizational Analysis')
    }
    if (typeNames.some(n => n.includes('location') || n.includes('place'))) {
      suggestions.push('Geographic Analysis')
    }
    
    return suggestions.slice(0, 3)
  }

  const startGraphCreation = async () => {
    setCurrentStep('creating')
    setError(null)
    setCreationProgress(0)
    
    try {
      setCreationStage('Initializing knowledge graph...')
      setCreationProgress(10)
      
      const response = await fetch(`/api/documents/${documentId}/apply-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityTypes,
          edgeTypes,
          config
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create knowledge graph')
      }

      const data = await response.json()
      
      // Simulate progress updates
      const stages = [
        'Creating ontology definition...',
        'Processing document content...',
        'Extracting entities and relationships...',
        'Building graph structure...',
        'Optimizing layout...',
        'Finalizing knowledge graph...'
      ]

      for (let i = 0; i < stages.length; i++) {
        setCreationStage(stages[i])
        setCreationProgress(20 + (i * 13))
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      setCreationProgress(100)
      setGraphId(data.graphId)
      setCurrentStep('complete')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setCurrentStep('configuration')
    }
  }

  const handleComplete = () => {
    if (graphId) {
      onComplete(graphId)
    }
  }

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Document Summary</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{documentName}</p>
                <p className="text-sm text-muted-foreground">Ready for knowledge graph creation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Selected Types</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Entity Types ({entityTypes.length})</Label>
            <div className="flex flex-wrap gap-2">
              {entityTypes.map(type => (
                <Badge key={type.id} variant="secondary">
                  {type.name}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Edge Types ({edgeTypes.length})</Label>
            <div className="flex flex-wrap gap-2">
              {edgeTypes.map(type => (
                <Badge key={type.id} variant="outline">
                  {type.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => setCurrentStep('configuration')}>
          Configure Graph
        </Button>
      </div>
    </div>
  )

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Graph Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="graph-name">Graph Name</Label>
            <Input
              id="graph-name"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter graph name"
            />
          </div>

          <div>
            <Label htmlFor="graph-description">Description</Label>
            <Textarea
              id="graph-description"
              value={config.description}
              onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this knowledge graph"
              rows={3}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Privacy & Sharing</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Private Graph</Label>
                  <p className="text-sm text-muted-foreground">Only you can access this graph</p>
                </div>
              </div>
              <Switch
                checked={config.isPrivate}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isPrivate: checked }))}
              />
            </div>

            {!config.isPrivate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Allow Collaboration</Label>
                    <p className="text-sm text-muted-foreground">Let others contribute to this graph</p>
                  </div>
                </div>
                <Switch
                  checked={config.allowCollaboration}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allowCollaboration: checked }))}
                />
              </div>
            )}
          </div>

          <Separator />

          <div>
            <Label>Suggested Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {generateSmartSuggestions().map(suggestion => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    if (!config.tags.includes(suggestion)) {
                      setConfig(prev => ({ ...prev, tags: [...prev.tags, suggestion] }))
                    }
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
            {config.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Label className="text-sm">Selected:</Label>
                {config.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      tags: prev.tags.filter(t => t !== tag)
                    }))}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={() => setCurrentStep('summary')}>
          Back
        </Button>
        <Button onClick={startGraphCreation} disabled={!config.name.trim()}>
          Create Knowledge Graph
        </Button>
      </div>
    </div>
  )

  const renderCreatingStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold">Creating Your Knowledge Graph</h3>
        <p className="text-muted-foreground">This may take a minute...</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Progress value={creationProgress} className="h-2" />
        <p className="text-sm text-muted-foreground">{creationStage}</p>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Knowledge Graph Created!</h3>
        <p className="text-muted-foreground">Your graph is ready for exploration</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="font-medium">{config.name}</p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{entityTypes.length} entity types</span>
              <span>•</span>
              <span>{edgeTypes.length} edge types</span>
              <span>•</span>
              <span>{config.isPrivate ? 'Private' : 'Public'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={handleComplete} className="w-full">
          Explore Knowledge Graph
        </Button>
        <Button variant="outline" onClick={onCancel} className="w-full">
          Return to Dashboard
        </Button>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle>Create Knowledge Graph</CardTitle>
            <CardDescription>
              {currentStep === 'summary' && 'Review your ontology selection'}
              {currentStep === 'configuration' && 'Configure graph settings'}
              {currentStep === 'creating' && 'Processing your document'}
              {currentStep === 'complete' && 'Graph created successfully'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {currentStep === 'summary' && renderSummaryStep()}
        {currentStep === 'configuration' && renderConfigurationStep()}
        {currentStep === 'creating' && renderCreatingStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  )
}

export default GraphCreationWizard