import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileText, RefreshCw, Copy, Check } from 'lucide-react'
import type { TestEntity, TestEdge, TextTemplate, SampleText } from '@/types/testing'

interface TextGeneratorProps {
  entities: TestEntity[]
  edges: TestEdge[]
  onGenerate: (sampleText: SampleText) => void
}

const DEFAULT_TEMPLATES: TextTemplate[] = [
  {
    template: '{person1.first_name} {person1.last_name} works as a {employment.role} at {company1.name}.',
    entityPlaceholders: [
      { placeholder: '{person1.first_name}', entityType: 'Person', fieldRef: 'first_name' },
      { placeholder: '{person1.last_name}', entityType: 'Person', fieldRef: 'last_name' },
      { placeholder: '{company1.name}', entityType: 'Company', fieldRef: 'name' }
    ],
    edgePlaceholders: [
      { placeholder: '{employment.role}', edgeType: 'Employment', format: 'role' }
    ]
  },
  {
    template: 'Founded in {company1.founded}, {company1.name} is a {company1.industry} company with {company1.employees} employees.',
    entityPlaceholders: [
      { placeholder: '{company1.name}', entityType: 'Company', fieldRef: 'name' },
      { placeholder: '{company1.founded}', entityType: 'Company', fieldRef: 'founded' },
      { placeholder: '{company1.industry}', entityType: 'Company', fieldRef: 'industry' },
      { placeholder: '{company1.employees}', entityType: 'Company', fieldRef: 'employees' }
    ],
    edgePlaceholders: []
  }
]

export default function TextGenerator({ entities, edges, onGenerate }: TextGeneratorProps) {
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATES[0].template)
  const [generatedText, setGeneratedText] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const generateText = () => {
    let text = template
    const entityRefs: any[] = []
    const edgeRefs: any[] = []

    // Extract placeholders from template
    const entityMatches = template.match(/\{([^}]+)\}/g) || []
    
    entityMatches.forEach(match => {
      const cleanMatch = match.slice(1, -1) // Remove { }
      const parts = cleanMatch.split('.')
      
      if (parts.length === 2) {
        const [entityRef, fieldRef] = parts
        
        // Find matching entity
        const entityTypeName = entityRef.replace(/[0-9]/g, '') // Remove numbers
        const entity = entities.find(e => 
          e.entityTypeName.toLowerCase() === entityTypeName.toLowerCase()
        )
        
        if (entity) {
          const value = entity.data[fieldRef] || `[${fieldRef}]`
          const startPos = text.indexOf(match)
          
          entityRefs.push({
            entityId: entity.id,
            startPos,
            endPos: startPos + String(value).length,
            fieldRef
          })
          
          text = text.replace(match, String(value))
        } else {
          text = text.replace(match, `[${cleanMatch}]`)
        }
      } else if (edges.length > 0) {
        // Try to match edge attributes
        const edgeTypeName = parts[0].replace(/[0-9]/g, '')
        const edge = edges.find(e => 
          e.edgeTypeName.toLowerCase() === edgeTypeName.toLowerCase()
        )
        
        if (edge && parts[1]) {
          const value = edge.attributes[parts[1]] || `[${parts[1]}]`
          const startPos = text.indexOf(match)
          
          edgeRefs.push({
            edgeId: edge.id,
            startPos,
            endPos: startPos + String(value).length
          })
          
          text = text.replace(match, String(value))
        } else {
          text = text.replace(match, `[${cleanMatch}]`)
        }
      }
    })

    setGeneratedText(text)
    
    const sampleText: SampleText = {
      id: `sample-${Date.now()}`,
      text,
      entityReferences: entityRefs,
      edgeReferences: edgeRefs,
      template
    }
    
    onGenerate(sampleText)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loadTemplate = (templateIndex: number) => {
    setTemplate(DEFAULT_TEMPLATES[templateIndex].template)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sample Text Generator
        </CardTitle>
        <CardDescription>
          Generate text samples containing your test entities and relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Template</Label>
          <div className="flex gap-2 mb-2">
            {DEFAULT_TEMPLATES.map((t, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => loadTemplate(i)}
              >
                Template {i + 1}
              </Button>
            ))}
          </div>
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Enter template with placeholders like {entity.field}"
            rows={4}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Use placeholders like:</p>
            <ul className="list-disc list-inside ml-2">
              <li>{'{person1.first_name}'} for entity fields</li>
              <li>{'{employment.role}'} for edge attributes</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateText}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Text
          </Button>
        </div>

        {generatedText && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Generated Text</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 border rounded-lg bg-muted/10">
              <p className="whitespace-pre-wrap">{generatedText}</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {entities.length > 0 && (
                <Badge variant="secondary">
                  {entities.length} entities used
                </Badge>
              )}
              {edges.length > 0 && (
                <Badge variant="secondary">
                  {edges.length} edges used
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}