import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trash2, 
  Save, 
  Upload, 
  Download, 
  Lightbulb, 
  TestTube, 
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw
} from 'lucide-react';

export interface EntityType {
  id: string;
  name: string;
  description: string;
  attributes: string[];
  examples: string[];
  validationRules: string[];
  color?: string;
}

export interface EdgeType {
  id: string;
  name: string;
  description: string;
  sourceTypes: string[];
  targetTypes: string[];
  attributes: string[];
  constraints?: string[];
}

export interface OntologyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  entityTypes: EntityType[];
  edgeTypes: EdgeType[];
  metadata: {
    created: string;
    author: string;
    version: string;
    tags: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ManualOntologyBuilderProps {
  initialOntology?: OntologyTemplate;
  availableTemplates?: OntologyTemplate[];
  sampleText?: string;
  onSave: (ontology: OntologyTemplate) => Promise<void>;
  onTest: (ontology: OntologyTemplate, text: string) => Promise<ValidationResult>;
  onImportTemplate: (templateId: string) => Promise<OntologyTemplate>;
  className?: string;
}

export const ManualOntologyBuilder: React.FC<ManualOntologyBuilderProps> = ({
  initialOntology,
  availableTemplates = [],
  sampleText = '',
  onSave,
  onTest,
  onImportTemplate,
  className = '',
}) => {
  const [ontology, setOntology] = useState<OntologyTemplate>(
    initialOntology || {
      id: `ontology_${Date.now()}`,
      name: 'Custom Ontology',
      description: '',
      category: 'custom',
      entityTypes: [],
      edgeTypes: [],
      metadata: {
        created: new Date().toISOString(),
        author: 'User',
        version: '1.0.0',
        tags: []
      }
    }
  );

  const [activeTab, setActiveTab] = useState('entities');
  const [editingEntity, setEditingEntity] = useState<EntityType | null>(null);
  const [editingEdge, setEditingEdge] = useState<EdgeType | null>(null);
  const [testResults, setTestResults] = useState<ValidationResult | null>(null);
  const [isTestingPattern, setIsTestingPattern] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [newAttribute, setNewAttribute] = useState('');
  const [newExample, setNewExample] = useState('');

  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-red-100 text-red-800',
    'bg-gray-100 text-gray-800'
  ];

  const handleCreateEntity = () => {
    const newEntity: EntityType = {
      id: `entity_${Date.now()}`,
      name: '',
      description: '',
      attributes: [],
      examples: [],
      validationRules: [],
      color: colors[ontology.entityTypes.length % colors.length]
    };
    setEditingEntity(newEntity);
  };

  const handleSaveEntity = (entity: EntityType) => {
    setOntology(prev => ({
      ...prev,
      entityTypes: prev.entityTypes.find(e => e.id === entity.id)
        ? prev.entityTypes.map(e => e.id === entity.id ? entity : e)
        : [...prev.entityTypes, entity]
    }));
    setEditingEntity(null);
  };

  const handleDeleteEntity = (entityId: string) => {
    setOntology(prev => ({
      ...prev,
      entityTypes: prev.entityTypes.filter(e => e.id !== entityId),
      edgeTypes: prev.edgeTypes.map(edge => ({
        ...edge,
        sourceTypes: edge.sourceTypes.filter(t => t !== entityId),
        targetTypes: edge.targetTypes.filter(t => t !== entityId)
      }))
    }));
  };

  const handleCreateEdge = () => {
    const newEdge: EdgeType = {
      id: `edge_${Date.now()}`,
      name: '',
      description: '',
      sourceTypes: [],
      targetTypes: [],
      attributes: []
    };
    setEditingEdge(newEdge);
  };

  const handleSaveEdge = (edge: EdgeType) => {
    setOntology(prev => ({
      ...prev,
      edgeTypes: prev.edgeTypes.find(e => e.id === edge.id)
        ? prev.edgeTypes.map(e => e.id === edge.id ? edge : e)
        : [...prev.edgeTypes, edge]
    }));
    setEditingEdge(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setOntology(prev => ({
      ...prev,
      edgeTypes: prev.edgeTypes.filter(e => e.id !== edgeId)
    }));
  };

  const handleImportTemplate = async (templateId: string) => {
    try {
      const template = await onImportTemplate(templateId);
      setOntology(prev => ({
        ...prev,
        entityTypes: [...prev.entityTypes, ...template.entityTypes],
        edgeTypes: [...prev.edgeTypes, ...template.edgeTypes]
      }));
    } catch (error) {
      console.error('Failed to import template:', error);
    }
  };

  const handleTestPattern = async () => {
    if (!sampleText) return;

    setIsTestingPattern(true);
    setTestProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const results = await onTest(ontology, sampleText);
      setTestResults(results);
      setTestProgress(100);
    } catch (error) {
      console.error('Pattern testing failed:', error);
      setTestResults({
        isValid: false,
        errors: ['Failed to test pattern'],
        warnings: [],
        suggestions: []
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsTestingPattern(false);
        setTestProgress(0);
      }, 1000);
    }
  };

  const handleSaveOntology = async () => {
    try {
      await onSave(ontology);
    } catch (error) {
      console.error('Failed to save ontology:', error);
    }
  };

  const handleExportOntology = () => {
    const dataStr = JSON.stringify(ontology, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${ontology.name.replace(/\s+/g, '_')}_ontology.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const entityTypeOptions = ontology.entityTypes.map(et => ({
    value: et.id,
    label: et.name || 'Unnamed Entity'
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Manual Ontology Builder</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {availableTemplates.map(template => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-600">{template.description}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary">{template.category}</Badge>
                            <span className="text-xs text-gray-500">
                              {template.entityTypes.length} entities, {template.edgeTypes.length} edges
                            </span>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleImportTemplate(template.id)}>
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleExportOntology}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleSaveOntology}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ontology Name</Label>
              <Input
                value={ontology.name}
                onChange={(e) => setOntology(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter ontology name"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={ontology.category}
                onValueChange={(value) => setOntology(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label>Description</Label>
            <Textarea
              value={ontology.description}
              onChange={(e) => setOntology(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the purpose and scope of this ontology"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTab value="entities">
            Entity Types ({ontology.entityTypes.length})
          </TabsTab>
          <TabsTab value="edges">
            Edge Types ({ontology.edgeTypes.length})
          </TabsTab>
          <TabsTab value="test">
            Pattern Testing
          </TabsTab>
          <TabsTab value="preview">
            Preview
          </TabsTab>
        </TabsList>

        <TabsContent value="entities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Entity Types</h3>
            <Button onClick={handleCreateEntity}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ontology.entityTypes.map(entity => (
              <Card key={entity.id} className="border-l-4" style={{borderLeftColor: entity.color?.includes('blue') ? '#3b82f6' : '#6b7280'}}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{entity.name || 'Unnamed Entity'}</div>
                      <div className="text-sm text-gray-600 mt-1">{entity.description}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entity.attributes.slice(0, 3).map(attr => (
                          <Badge key={attr} variant="secondary" className="text-xs">
                            {attr}
                          </Badge>
                        ))}
                        {entity.attributes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{entity.attributes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEntity(entity)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEntity(entity.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="edges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Edge Types</h3>
            <Button onClick={handleCreateEdge}>
              <Plus className="h-4 w-4 mr-2" />
              Add Edge Type
            </Button>
          </div>

          <div className="space-y-3">
            {ontology.edgeTypes.map(edge => (
              <Card key={edge.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{edge.name || 'Unnamed Edge'}</div>
                      <div className="text-sm text-gray-600 mt-1">{edge.description}</div>
                      <div className="flex items-center space-x-2 mt-2 text-xs">
                        <span>From:</span>
                        <div className="flex space-x-1">
                          {edge.sourceTypes.map(typeId => {
                            const entityType = ontology.entityTypes.find(et => et.id === typeId);
                            return (
                              <Badge key={typeId} variant="outline">
                                {entityType?.name || typeId}
                              </Badge>
                            );
                          })}
                        </div>
                        <span>To:</span>
                        <div className="flex space-x-1">
                          {edge.targetTypes.map(typeId => {
                            const entityType = ontology.entityTypes.find(et => et.id === typeId);
                            return (
                              <Badge key={typeId} variant="outline">
                                {entityType?.name || typeId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEdge(edge)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEdge(edge.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Pattern Testing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Test Text</Label>
                <Textarea
                  value={sampleText}
                  placeholder="Enter sample text to test your ontology patterns"
                  rows={4}
                  readOnly
                />
              </div>

              {isTestingPattern && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Testing patterns...</span>
                  </div>
                  <Progress value={testProgress} className="h-2" />
                </div>
              )}

              <Button onClick={handleTestPattern} disabled={!sampleText || isTestingPattern}>
                <TestTube className="h-4 w-4 mr-2" />
                Test Patterns
              </Button>

              {testResults && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {testResults.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {testResults.isValid ? 'Patterns Valid' : 'Issues Found'}
                    </span>
                  </div>

                  {testResults.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Errors</h4>
                      <ul className="space-y-1">
                        {testResults.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                            <span>•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResults.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                      <ul className="space-y-1">
                        {testResults.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-600 flex items-start space-x-2">
                            <span>•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResults.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">Suggestions</h4>
                      <ul className="space-y-1">
                        {testResults.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-blue-600 flex items-start space-x-2">
                            <Lightbulb className="h-3 w-3 mt-0.5" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ontology Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Entity Types ({ontology.entityTypes.length})</h4>
                  <div className="space-y-2">
                    {ontology.entityTypes.map(entity => (
                      <div key={entity.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{entity.name}</span>
                        <Badge variant="secondary">
                          {entity.attributes.length} attrs
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Edge Types ({ontology.edgeTypes.length})</h4>
                  <div className="space-y-2">
                    {ontology.edgeTypes.map(edge => (
                      <div key={edge.id} className="p-2 border rounded">
                        <div className="font-medium">{edge.name}</div>
                        <div className="text-xs text-gray-600">
                          {edge.sourceTypes.length} → {edge.targetTypes.length} types
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entity Editor Dialog */}
      {editingEntity && (
        <Dialog open={!!editingEntity} onOpenChange={() => setEditingEntity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEntity.name ? `Edit ${editingEntity.name}` : 'Create Entity Type'}
              </DialogTitle>
            </DialogHeader>
            <EntityTypeEditor
              entity={editingEntity}
              onSave={handleSaveEntity}
              onCancel={() => setEditingEntity(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edge Editor Dialog */}
      {editingEdge && (
        <Dialog open={!!editingEdge} onOpenChange={() => setEditingEdge(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEdge.name ? `Edit ${editingEdge.name}` : 'Create Edge Type'}
              </DialogTitle>
            </DialogHeader>
            <EdgeTypeEditor
              edge={editingEdge}
              entityTypes={ontology.entityTypes}
              onSave={handleSaveEdge}
              onCancel={() => setEditingEdge(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Entity Type Editor Component
const EntityTypeEditor: React.FC<{
  entity: EntityType;
  onSave: (entity: EntityType) => void;
  onCancel: () => void;
}> = ({ entity, onSave, onCancel }) => {
  const [localEntity, setLocalEntity] = useState(entity);
  const [newAttribute, setNewAttribute] = useState('');
  const [newExample, setNewExample] = useState('');

  const handleAddAttribute = () => {
    if (newAttribute.trim()) {
      setLocalEntity(prev => ({
        ...prev,
        attributes: [...prev.attributes, newAttribute.trim()]
      }));
      setNewAttribute('');
    }
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      setLocalEntity(prev => ({
        ...prev,
        examples: [...prev.examples, newExample.trim()]
      }));
      setNewExample('');
    }
  };

  const handleRemoveAttribute = (index: number) => {
    setLocalEntity(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveExample = (index: number) => {
    setLocalEntity(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Entity Name</Label>
          <Input
            value={localEntity.name}
            onChange={(e) => setLocalEntity(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter entity name"
          />
        </div>
        <div>
          <Label>Color</Label>
          <Select
            value={localEntity.color}
            onValueChange={(color) => setLocalEntity(prev => ({ ...prev, color }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bg-blue-100 text-blue-800">Blue</SelectItem>
              <SelectItem value="bg-green-100 text-green-800">Green</SelectItem>
              <SelectItem value="bg-yellow-100 text-yellow-800">Yellow</SelectItem>
              <SelectItem value="bg-purple-100 text-purple-800">Purple</SelectItem>
              <SelectItem value="bg-pink-100 text-pink-800">Pink</SelectItem>
              <SelectItem value="bg-red-100 text-red-800">Red</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={localEntity.description}
          onChange={(e) => setLocalEntity(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe this entity type"
          rows={2}
        />
      </div>

      <div>
        <Label>Attributes</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newAttribute}
            onChange={(e) => setNewAttribute(e.target.value)}
            placeholder="Add attribute"
            onKeyPress={(e) => e.key === 'Enter' && handleAddAttribute()}
          />
          <Button onClick={handleAddAttribute} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {localEntity.attributes.map((attr, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{attr}</span>
              <button onClick={() => handleRemoveAttribute(index)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Examples</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            placeholder="Add example"
            onKeyPress={(e) => e.key === 'Enter' && handleAddExample()}
          />
          <Button onClick={handleAddExample} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {localEntity.examples.map((example, index) => (
            <Badge key={index} variant="outline" className="flex items-center space-x-1">
              <span>{example}</span>
              <button onClick={() => handleRemoveExample(index)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(localEntity)}>Save Entity</Button>
      </div>
    </div>
  );
};

// Edge Type Editor Component
const EdgeTypeEditor: React.FC<{
  edge: EdgeType;
  entityTypes: EntityType[];
  onSave: (edge: EdgeType) => void;
  onCancel: () => void;
}> = ({ edge, entityTypes, onSave, onCancel }) => {
  const [localEdge, setLocalEdge] = useState(edge);

  const entityOptions = entityTypes.map(et => ({
    value: et.id,
    label: et.name || 'Unnamed Entity'
  }));

  const handleToggleSourceType = (typeId: string) => {
    setLocalEdge(prev => ({
      ...prev,
      sourceTypes: prev.sourceTypes.includes(typeId)
        ? prev.sourceTypes.filter(id => id !== typeId)
        : [...prev.sourceTypes, typeId]
    }));
  };

  const handleToggleTargetType = (typeId: string) => {
    setLocalEdge(prev => ({
      ...prev,
      targetTypes: prev.targetTypes.includes(typeId)
        ? prev.targetTypes.filter(id => id !== typeId)
        : [...prev.targetTypes, typeId]
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Edge Name</Label>
        <Input
          value={localEdge.name}
          onChange={(e) => setLocalEdge(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter edge name"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={localEdge.description}
          onChange={(e) => setLocalEdge(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe this relationship type"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Source Types</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
            {entityTypes.map(entity => (
              <label key={entity.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localEdge.sourceTypes.includes(entity.id)}
                  onChange={() => handleToggleSourceType(entity.id)}
                />
                <span>{entity.name || 'Unnamed Entity'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Target Types</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
            {entityTypes.map(entity => (
              <label key={entity.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localEdge.targetTypes.includes(entity.id)}
                  onChange={() => handleToggleTargetType(entity.id)}
                />
                <span>{entity.name || 'Unnamed Entity'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(localEdge)}>Save Edge</Button>
      </div>
    </div>
  );
};