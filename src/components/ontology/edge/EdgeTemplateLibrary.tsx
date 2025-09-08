import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { EdgeTypeDefinition } from './EdgeTypeEditor'
import { Users, Briefcase, Share2, DollarSign, MessageCircle, MapPin, Clock, GitBranch, Link } from 'lucide-react'

interface EdgeTemplateLibraryProps {
  onSelect: (template: EdgeTypeDefinition) => void
  entityTypes: string[]
}

interface EdgeTemplate extends Omit<EdgeTypeDefinition, 'ontologyId' | 'validation'> {
  icon: React.ReactNode
  requiredEntities?: string[]
}

const EDGE_TEMPLATES: EdgeTemplate[] = [
  {
    id: 'employment',
    name: 'Employment',
    description: 'Person works at Company',
    icon: <Briefcase className="h-5 w-5" />,
    attributes: [
      { name: 'role', type: 'str', isOptional: false, description: 'Job title or position' },
      { name: 'start_date', type: 'datetime', isOptional: false, description: 'Employment start date' },
      { name: 'end_date', type: 'datetime', isOptional: true, description: 'Employment end date' },
      { name: 'salary', type: 'float', isOptional: true, description: 'Annual salary' },
      { name: 'department', type: 'str', isOptional: true, description: 'Department or division' }
    ],
    mappings: [
      { sourceEntity: 'Person', targetEntity: 'Company', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Employment'
    },
    requiredEntities: ['Person', 'Company']
  },
  {
    id: 'ownership',
    name: 'Ownership',
    description: 'Entity owns another entity',
    icon: <DollarSign className="h-5 w-5" />,
    attributes: [
      { name: 'percentage', type: 'float', isOptional: false, description: 'Ownership percentage' },
      { name: 'acquisition_date', type: 'datetime', isOptional: false, description: 'Date of acquisition' },
      { name: 'value', type: 'float', isOptional: true, description: 'Value of ownership' },
      { name: 'ownership_type', type: 'str', isOptional: true, description: 'Type of ownership' }
    ],
    mappings: [
      { sourceEntity: 'Person', targetEntity: 'Company', cardinality: 'n:n' },
      { sourceEntity: 'Company', targetEntity: 'Company', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Ownership'
    },
    requiredEntities: ['Person', 'Company']
  },
  {
    id: 'partnership',
    name: 'Partnership',
    description: 'Business partnership between companies',
    icon: <Share2 className="h-5 w-5" />,
    attributes: [
      { name: 'partnership_type', type: 'str', isOptional: false, description: 'Type of partnership' },
      { name: 'start_date', type: 'datetime', isOptional: false, description: 'Partnership start date' },
      { name: 'end_date', type: 'datetime', isOptional: true, description: 'Partnership end date' },
      { name: 'agreement_id', type: 'str', isOptional: true, description: 'Agreement identifier' },
      { name: 'value', type: 'float', isOptional: true, description: 'Partnership value' }
    ],
    mappings: [
      { sourceEntity: 'Company', targetEntity: 'Company', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: false,
      category: 'Partnership'
    },
    requiredEntities: ['Company']
  },
  {
    id: 'membership',
    name: 'Membership',
    description: 'Person is member of organization',
    icon: <Users className="h-5 w-5" />,
    attributes: [
      { name: 'member_type', type: 'str', isOptional: false, description: 'Type of membership' },
      { name: 'join_date', type: 'datetime', isOptional: false, description: 'Membership start date' },
      { name: 'status', type: 'str', isOptional: false, description: 'Active, Inactive, Suspended' },
      { name: 'member_id', type: 'str', isOptional: true, description: 'Membership ID' }
    ],
    mappings: [
      { sourceEntity: 'Person', targetEntity: 'Organization', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Membership'
    },
    requiredEntities: ['Person', 'Organization']
  },
  {
    id: 'transaction',
    name: 'Transaction',
    description: 'Financial transaction between entities',
    icon: <DollarSign className="h-5 w-5" />,
    attributes: [
      { name: 'amount', type: 'float', isOptional: false, description: 'Transaction amount' },
      { name: 'transaction_date', type: 'datetime', isOptional: false, description: 'Date of transaction' },
      { name: 'transaction_type', type: 'str', isOptional: false, description: 'Payment, Transfer, etc.' },
      { name: 'currency', type: 'str', isOptional: false, description: 'Currency code' },
      { name: 'reference', type: 'str', isOptional: true, description: 'Transaction reference' }
    ],
    mappings: [
      { sourceEntity: '*', targetEntity: '*', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Transaction'
    }
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Communication between entities',
    icon: <MessageCircle className="h-5 w-5" />,
    attributes: [
      { name: 'communication_type', type: 'str', isOptional: false, description: 'Email, Phone, Meeting, etc.' },
      { name: 'timestamp', type: 'datetime', isOptional: false, description: 'When communication occurred' },
      { name: 'subject', type: 'str', isOptional: true, description: 'Subject or topic' },
      { name: 'duration', type: 'int', isOptional: true, description: 'Duration in minutes' }
    ],
    mappings: [
      { sourceEntity: 'Person', targetEntity: 'Person', cardinality: 'n:n' },
      { sourceEntity: 'Person', targetEntity: 'Company', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Communication'
    },
    requiredEntities: ['Person']
  },
  {
    id: 'location',
    name: 'Located At',
    description: 'Entity is located at a place',
    icon: <MapPin className="h-5 w-5" />,
    attributes: [
      { name: 'address', type: 'str', isOptional: false, description: 'Physical address' },
      { name: 'location_type', type: 'str', isOptional: false, description: 'Headquarters, Branch, etc.' },
      { name: 'from_date', type: 'datetime', isOptional: true, description: 'Start of location' },
      { name: 'to_date', type: 'datetime', isOptional: true, description: 'End of location' }
    ],
    mappings: [
      { sourceEntity: '*', targetEntity: 'Location', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Location'
    },
    requiredEntities: ['Location']
  },
  {
    id: 'temporal',
    name: 'Temporal Relation',
    description: 'Time-based relationship',
    icon: <Clock className="h-5 w-5" />,
    attributes: [
      { name: 'relation_type', type: 'str', isOptional: false, description: 'Before, After, During, etc.' },
      { name: 'start_time', type: 'datetime', isOptional: false, description: 'Relationship start' },
      { name: 'end_time', type: 'datetime', isOptional: true, description: 'Relationship end' }
    ],
    mappings: [
      { sourceEntity: '*', targetEntity: '*', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Temporal'
    }
  },
  {
    id: 'hierarchical',
    name: 'Hierarchy',
    description: 'Parent-child or hierarchical relationship',
    icon: <GitBranch className="h-5 w-5" />,
    attributes: [
      { name: 'hierarchy_type', type: 'str', isOptional: false, description: 'Parent, Subsidiary, etc.' },
      { name: 'level', type: 'int', isOptional: true, description: 'Hierarchy level' }
    ],
    mappings: [
      { sourceEntity: '*', targetEntity: '*', cardinality: '1:n' }
    ],
    metadata: {
      isDirectional: true,
      category: 'Hierarchical'
    }
  },
  {
    id: 'generic',
    name: 'Generic Association',
    description: 'General-purpose relationship',
    icon: <Link className="h-5 w-5" />,
    attributes: [
      { name: 'association_type', type: 'str', isOptional: false, description: 'Type of association' },
      { name: 'strength', type: 'float', isOptional: true, description: 'Strength of association (0-1)' },
      { name: 'metadata', type: 'Dict[str, Any]', isOptional: true, description: 'Additional metadata' }
    ],
    mappings: [
      { sourceEntity: '*', targetEntity: '*', cardinality: 'n:n' }
    ],
    metadata: {
      isDirectional: false,
      category: 'Association'
    }
  }
]

export const EdgeTemplateLibrary: React.FC<EdgeTemplateLibraryProps> = ({
  onSelect,
  entityTypes
}) => {
  const isTemplateCompatible = (template: EdgeTemplate): boolean => {
    if (!template.requiredEntities) return true
    return template.requiredEntities.every(entity => entityTypes.includes(entity))
  }

  const handleSelectTemplate = (template: EdgeTemplate) => {
    const { ...templateData } = template
    onSelect({
      ...templateData,
      ontologyId: '', // Will be set by parent
      validation: {
        isValid: false,
        errors: []
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select a template to quickly create common edge types. Templates can be customized after selection.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EDGE_TEMPLATES.map(template => {
          const isCompatible = isTemplateCompatible(template)
          
          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-colors ${
                isCompatible
                  ? 'hover:border-primary'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => isCompatible && handleSelectTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {template.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {template.metadata.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Attributes ({template.attributes.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.attributes.slice(0, 3).map(attr => (
                      <Badge key={attr.name} variant="outline" className="text-xs">
                        {attr.name}
                      </Badge>
                    ))}
                    {template.attributes.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.attributes.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Mappings
                  </p>
                  <div className="text-xs space-y-1">
                    {template.mappings.slice(0, 2).map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span>{mapping.sourceEntity}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{mapping.targetEntity}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {mapping.cardinality}
                        </Badge>
                      </div>
                    ))}
                    {template.mappings.length > 2 && (
                      <div className="text-muted-foreground">
                        +{template.mappings.length - 2} more mappings
                      </div>
                    )}
                  </div>
                </div>

                {!isCompatible && template.requiredEntities && (
                  <div className="text-xs text-destructive">
                    Missing entities: {template.requiredEntities.filter(e => !entityTypes.includes(e)).join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}