import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Code, Copy, Check } from 'lucide-react'
import type { TestEntity, TestEdge, TestDataSet } from '@/types/testing'

interface PythonFixtureExporterProps {
  testDataSet: TestDataSet
}

export default function PythonFixtureExporter({ testDataSet }: PythonFixtureExporterProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('fixtures')

  const generatePythonFixtures = (): string => {
    const entities = testDataSet.entities
    const edges = testDataSet.edges
    
    let code = `"""
Test fixtures generated from Krypton Graph Test Dataset
Dataset: ${testDataSet.name}
Created: ${testDataSet.metadata.createdAt}
"""
import pytest
from datetime import datetime
from typing import List, Dict, Any

# Import your entity and edge classes here
# from ontology_v1 import ${[...new Set(entities.map(e => e.entityTypeName))].join(', ')}
${edges.length > 0 ? `# from ontology_v1 import ${[...new Set(edges.map(e => e.edgeTypeName))].join(', ')}` : ''}

`

    // Generate entity fixtures
    entities.forEach((entity, index) => {
      const typeName = entity.entityTypeName.toLowerCase()
      code += `@pytest.fixture
def test_${typeName}_${index + 1}():
    """Test instance of ${entity.entityTypeName}"""
    return ${entity.entityTypeName}(
${Object.entries(entity.data).map(([key, value]) => {
  let formattedValue = value
  if (typeof value === 'string') {
    formattedValue = `"${value}"`
  } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
    formattedValue = `datetime.fromisoformat("${value}")`
  } else if (Array.isArray(value)) {
    formattedValue = JSON.stringify(value)
  }
  return `        ${key}=${formattedValue}`
}).join(',\n')}
    )

`
    })

    // Generate edge fixtures
    edges.forEach((edge, index) => {
      const sourceEntity = entities.find(e => e.id === edge.sourceEntityId)
      const targetEntity = entities.find(e => e.id === edge.targetEntityId)
      const sourceIndex = entities.indexOf(sourceEntity!)
      const targetIndex = entities.indexOf(targetEntity!)
      
      code += `@pytest.fixture
def test_${edge.edgeTypeName.toLowerCase()}_${index + 1}(test_${sourceEntity?.entityTypeName.toLowerCase()}_${sourceIndex + 1}, test_${targetEntity?.entityTypeName.toLowerCase()}_${targetIndex + 1}):
    """Test ${edge.edgeTypeName} relationship"""
    return ${edge.edgeTypeName}(
        source=test_${sourceEntity?.entityTypeName.toLowerCase()}_${sourceIndex + 1},
        target=test_${targetEntity?.entityTypeName.toLowerCase()}_${targetIndex + 1},
${Object.entries(edge.attributes).map(([key, value]) => {
  let formattedValue = value
  if (typeof value === 'string') {
    formattedValue = `"${value}"`
  } else if (value instanceof Date) {
    formattedValue = `datetime.fromisoformat("${value.toISOString()}")`
  }
  return `        ${key}=${formattedValue}`
}).join(',\n')}
    )

`
    })

    // Generate test dataset fixture
    code += `@pytest.fixture
def test_dataset(${entities.map((e, i) => `test_${e.entityTypeName.toLowerCase()}_${i + 1}`).join(', ')}${edges.length > 0 ? ', ' + edges.map((e, i) => `test_${e.edgeTypeName.toLowerCase()}_${i + 1}`).join(', ') : ''}):
    """Complete test dataset"""
    return {
        "entities": [${entities.map((e, i) => `test_${e.entityTypeName.toLowerCase()}_${i + 1}`).join(', ')}],
        "edges": [${edges.map((e, i) => `test_${e.edgeTypeName.toLowerCase()}_${i + 1}`).join(', ')}],
        "sample_texts": ${JSON.stringify(testDataSet.sampleTexts.map(s => s.text))}
    }
`

    return code
  }

  const generateJSONExport = (): string => {
    return JSON.stringify(testDataSet, null, 2)
  }

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const pythonCode = generatePythonFixtures()
  const jsonCode = generateJSONExport()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Export Test Fixtures
        </CardTitle>
        <CardDescription>
          Export your test dataset as Python fixtures or JSON
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fixtures">Python Fixtures</TabsTrigger>
            <TabsTrigger value="json">JSON Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fixtures" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>test_fixtures.py</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(pythonCode)}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(pythonCode, 'test_fixtures.py')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-900 text-zinc-100 overflow-x-auto max-h-96">
                <code className="text-sm">{pythonCode}</code>
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>test_data.json</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(jsonCode)}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(jsonCode, 'test_data.json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-900 text-zinc-100 overflow-x-auto max-h-96">
                <code className="text-sm">{jsonCode}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}