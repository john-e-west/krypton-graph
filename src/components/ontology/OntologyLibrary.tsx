import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { 
  Search, 
  Filter, 
  Star, 
  StarOff, 
  Download, 
  Copy, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Grid, 
  List,
  SortAsc,
  SortDesc,
  BookOpen,
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'

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

interface OntologyTemplate {
  id: string
  name: string
  description: string
  ontology: OntologyDefinition
  category: string
  isPublic: boolean
  tags: string[]
  createdBy: string
  createdAt: string
  lastModified: string
  usageCount: number
  rating: number
  ratingCount: number
}

interface OntologyLibraryProps {
  onTemplateSelect?: (template: OntologyTemplate) => void
  onTemplateUse?: (ontology: OntologyDefinition) => void
  canCreateTemplate?: boolean
  initialFilters?: {
    category?: string
    domain?: string
    tags?: string[]
    showPublicOnly?: boolean
  }
}

type ViewMode = 'grid' | 'list'
type SortField = 'created' | 'modified' | 'usage' | 'rating' | 'name'
type SortOrder = 'asc' | 'desc'

const CATEGORIES = [
  'Business',
  'Legal',
  'Medical', 
  'Academic',
  'Technical',
  'Financial',
  'Social',
  'Scientific',
  'Government',
  'Other'
]

export function OntologyLibrary({ 
  onTemplateSelect, 
  onTemplateUse, 
  canCreateTemplate = true,
  initialFilters = {} 
}: OntologyLibraryProps) {
  const [templates, setTemplates] = useState<OntologyTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<OntologyTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || 'all')
  const [selectedDomain, setSelectedDomain] = useState(initialFilters.domain || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags || [])
  const [showPublicOnly, setShowPublicOnly] = useState(initialFilters.showPublicOnly || false)
  
  // Dialog state
  const [selectedTemplate, setSelectedTemplate] = useState<OntologyTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Create template form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'Business',
    isPublic: false,
    tags: [] as string[],
    ontology: null as OntologyDefinition | null
  })

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedDomain) params.append('domain', selectedDomain)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (searchQuery) params.append('search', searchQuery)
      if (showPublicOnly) params.append('public', 'true')
      params.append('sortBy', sortField)
      params.append('sortOrder', sortOrder)
      params.append('limit', '50')

      const response = await fetch(`/api/ontologies/templates?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setTemplates(data.templates)
        setFilteredTemplates(data.templates)
      } else {
        throw new Error(data.error || 'Failed to fetch templates')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedDomain, selectedTags, searchQuery, showPublicOnly, sortField, sortOrder])

  // Load templates on mount and filter changes
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Handle template actions
  const handleUseTemplate = useCallback(async (template: OntologyTemplate) => {
    try {
      // Record usage
      await fetch(`/api/ontologies/templates/${template.id}/use`, {
        method: 'POST'
      })

      // Trigger callback
      if (onTemplateUse) {
        onTemplateUse(template.ontology)
      }

      // Refresh templates to update usage count
      fetchTemplates()
    } catch (error) {
      console.error('Failed to use template:', error)
    }
  }, [onTemplateUse, fetchTemplates])

  const handleRateTemplate = useCallback(async (templateId: string, rating: number) => {
    try {
      await fetch(`/api/ontologies/templates/${templateId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })
      
      fetchTemplates()
    } catch (error) {
      console.error('Failed to rate template:', error)
    }
  }, [fetchTemplates])

  const handleCloneTemplate = useCallback(async (template: OntologyTemplate) => {
    try {
      const response = await fetch(`/api/ontologies/templates/${template.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: `Cloned from ${template.name}`,
          isPublic: false
        })
      })

      if (response.ok) {
        fetchTemplates()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      console.error('Failed to clone template:', error)
    }
  }, [fetchTemplates])

  const handleCreateTemplate = useCallback(async () => {
    if (!createForm.ontology) return

    try {
      const response = await fetch('/api/ontologies/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          ontology: createForm.ontology,
          category: createForm.category,
          isPublic: createForm.isPublic,
          tags: createForm.tags
        })
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setCreateForm({
          name: '',
          description: '',
          category: 'Business',
          isPublic: false,
          tags: [],
          ontology: null
        })
        fetchTemplates()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }, [createForm, fetchTemplates])

  const availableTags = Array.from(new Set(templates.flatMap(t => t.tags)))

  const renderStarRating = (rating: number, ratingCount: number, templateId?: string, interactive: boolean = false) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      const isFilled = i < fullStars || (i === fullStars && hasHalfStar)
      stars.push(
        <button
          key={i}
          onClick={() => interactive && templateId && handleRateTemplate(templateId, i + 1)}
          className={interactive ? 'hover:scale-110 transition-transform' : ''}
          disabled={!interactive}
        >
          {isFilled ? (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="w-4 h-4 text-gray-300" />
          )}
        </button>
      )
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">{stars}</div>
        {ratingCount > 0 && (
          <span className="text-xs text-muted-foreground ml-2">
            ({ratingCount})
          </span>
        )}
      </div>
    )
  }

  const renderTemplateCard = (template: OntologyTemplate) => {
    if (viewMode === 'list') {
      return (
        <Card key={template.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <Badge variant="outline">{template.category}</Badge>
                    {template.isPublic ? (
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{template.ontology.entityTypes.length} entities, {template.ontology.edgeTypes.length} edges</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Used {template.usageCount} times</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {renderStarRating(template.rating, template.ratingCount, template.id, true)}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template)
                        setShowDetailsDialog(true)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )
    }

    return (
      <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{template.category}</Badge>
                {template.isPublic ? (
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline">Private</Badge>
                )}
              </div>
            </div>
          </div>
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {template.ontology.entityTypes.length}
                </div>
                <div className="text-xs text-muted-foreground">Entities</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {template.ontology.edgeTypes.length}
                </div>
                <div className="text-xs text-muted-foreground">Edges</div>
              </div>
            </div>

            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Used {template.usageCount} times
              </div>
              {renderStarRating(template.rating, template.ratingCount, template.id, true)}
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTemplate(template)
                  setShowDetailsDialog(true)
                }}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={() => handleUseTemplate(template)}
                className="flex-1"
              >
                Use
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ontology Library</h2>
          <p className="text-muted-foreground">Browse and reuse ontology patterns</p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateTemplate && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Ontology Template</DialogTitle>
                  <DialogDescription>
                    Save your ontology as a reusable template for future use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this template is for..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Category</Label>
                      <Select 
                        value={createForm.category} 
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={createForm.isPublic}
                          onCheckedChange={(checked) => 
                            setCreateForm(prev => ({ ...prev, isPublic: checked as boolean }))
                          }
                        />
                        <Label className="text-sm">Make template public</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={!createForm.name || !createForm.ontology}>
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="modified">Modified Date</SelectItem>
                  <SelectItem value="usage">Usage Count</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    <div className="flex items-center">
                      <SortDesc className="w-4 h-4 mr-2" />
                      Descending
                    </div>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center">
                      <SortAsc className="w-4 h-4 mr-2" />
                      Ascending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={showPublicOnly}
                  onCheckedChange={(checked) => setShowPublicOnly(checked as boolean)}
                />
                <Label className="text-sm">Public only</Label>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <BookOpen className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">No templates found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
          {canCreateTemplate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredTemplates.map(renderTemplateCard)}
        </div>
      )}

      {/* Template Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedTemplate.name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge>{selectedTemplate.category}</Badge>
                    {selectedTemplate.isPublic ? (
                      <Badge variant="secondary">Public</Badge>
                    ) : (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedTemplate.ontology.entityTypes.length}</div>
                    <div className="text-sm text-muted-foreground">Entity Types</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedTemplate.ontology.edgeTypes.length}</div>
                    <div className="text-sm text-muted-foreground">Edge Types</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedTemplate.usageCount}</div>
                    <div className="text-sm text-muted-foreground">Times Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedTemplate.rating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                </div>

                {/* Entity Types */}
                <div>
                  <h4 className="font-semibold mb-3">Entity Types</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTemplate.ontology.entityTypes.map(type => (
                      <Card key={type.id} className="p-3">
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </div>
                        {type.attributes && type.attributes.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium">Attributes:</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.attributes.map(attr => (
                                <Badge key={attr.name} variant="outline" className="text-xs">
                                  {attr.name}
                                  {attr.required && <span className="text-red-500">*</span>}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Edge Types */}
                {selectedTemplate.ontology.edgeTypes.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Edge Types</h4>
                    <div className="space-y-3">
                      {selectedTemplate.ontology.edgeTypes.map(type => (
                        <Card key={type.id} className="p-3">
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {type.sourceTypes.join(', ')} → {type.targetTypes.join(', ')}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedTemplate.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between">
                <div className="flex items-center space-x-2">
                  {renderStarRating(selectedTemplate.rating, selectedTemplate.ratingCount, selectedTemplate.id, true)}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCloneTemplate(selectedTemplate)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Clone
                  </Button>
                  <Button
                    onClick={() => {
                      handleUseTemplate(selectedTemplate)
                      setShowDetailsDialog(false)
                    }}
                  >
                    Use Template
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}