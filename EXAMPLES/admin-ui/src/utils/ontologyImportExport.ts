import { Node, Edge } from 'reactflow';

export interface OntologyExportData {
  version: string;
  metadata: {
    name: string;
    domain: string;
    description?: string;
    version?: string;
    exportedAt: number;
    exportedBy?: string;
    tags?: string[];
  };
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    properties: Record<string, any>;
    position?: { x: number; y: number };
    isHidden?: boolean;
    validationRules?: any[];
  }>;
  relationships: Array<{
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    type: string;
    cardinality: string;
    bidirectional?: boolean;
    properties?: Record<string, any>;
    description?: string;
  }>;
  layout?: {
    algorithm: string;
    settings: Record<string, any>;
  };
  validation?: {
    errors: any[];
    warnings: any[];
    lastValidated: number;
  };
}

export interface ImportResult {
  success: boolean;
  data?: OntologyExportData;
  errors: string[];
  warnings: string[];
  summary: {
    entitiesCount: number;
    relationshipsCount: number;
    propertiesCount: number;
  };
}

/**
 * Export ontology data to JSON format
 */
export function exportOntology(
  ontologyMetadata: any,
  nodes: Node[],
  edges: Edge[],
  options: {
    includeLayout?: boolean;
    includeValidation?: boolean;
    minify?: boolean;
  } = {}
): OntologyExportData {
  const { includeLayout = true, includeValidation = false } = options;

  // Convert ReactFlow nodes to entities
  const entities = nodes.map(node => ({
    id: node.id,
    name: node.data.label,
    type: node.data.type,
    description: node.data.description,
    properties: node.data.properties || {},
    position: includeLayout ? node.position : undefined,
    isHidden: node.data.isHidden,
    validationRules: node.data.validationRules,
  }));

  // Convert ReactFlow edges to relationships
  const relationships = edges.map(edge => ({
    id: edge.id,
    name: edge.data?.label || `${edge.source}-${edge.target}`,
    sourceId: edge.source,
    targetId: edge.target,
    type: edge.type || 'default',
    cardinality: edge.data?.cardinality || 'one-to-many',
    bidirectional: edge.data?.bidirectional,
    properties: edge.data?.properties,
    description: edge.data?.description,
  }));

  const exportData: OntologyExportData = {
    version: '1.0.0',
    metadata: {
      name: ontologyMetadata.name,
      domain: ontologyMetadata.domain,
      description: ontologyMetadata.description,
      version: ontologyMetadata.version,
      exportedAt: Date.now(),
      exportedBy: 'Krypton-Graph Editor',
      tags: ontologyMetadata.tags,
    },
    entities,
    relationships,
  };

  if (includeLayout) {
    exportData.layout = {
      algorithm: 'manual',
      settings: {
        nodeSpacing: 150,
        edgeSpacing: 50,
      },
    };
  }

  if (includeValidation) {
    exportData.validation = {
      errors: [], // TODO: Add actual validation
      warnings: [],
      lastValidated: Date.now(),
    };
  }

  return exportData;
}

/**
 * Download JSON data as a file
 */
export function downloadJSON(data: any, filename: string, minify = false): void {
  const jsonString = minify ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export ontology as YAML format
 */
export function exportAsYAML(data: OntologyExportData): string {
  // Simple YAML conversion - in a real app, use a proper YAML library
  const yamlString = Object.entries(data)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${key}:\n${JSON.stringify(value, null, 2).split('\n').map(line => `  ${line}`).join('\n')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n\n');
    
  return yamlString;
}

/**
 * Download YAML data as a file
 */
export function downloadYAML(data: OntologyExportData, filename: string): void {
  const yamlString = exportAsYAML(data);
  const blob = new Blob([yamlString], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.yaml') ? filename : `${filename}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import ontology from file
 */
export async function importOntologyFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data: OntologyExportData;
        
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          // In a real app, use a proper YAML parser
          resolve({
            success: false,
            errors: ['YAML import not yet implemented. Please use JSON format.'],
            warnings: [],
            summary: {
              entitiesCount: 0,
              relationshipsCount: 0,
              propertiesCount: 0,
            },
          });
          return;
        } else {
          resolve({
            success: false,
            errors: ['Unsupported file format. Please use JSON or YAML.'],
            warnings: [],
            summary: {
              entitiesCount: 0,
              relationshipsCount: 0,
              propertiesCount: 0,
            },
          });
          return;
        }
        
        const result = validateImportData(data);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          summary: {
            entitiesCount: 0,
            relationshipsCount: 0,
            propertiesCount: 0,
          },
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        errors: ['Failed to read file'],
        warnings: [],
        summary: {
          entitiesCount: 0,
          relationshipsCount: 0,
          propertiesCount: 0,
        },
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate imported ontology data
 */
export function validateImportData(data: any): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check basic structure
  if (!data.version) {
    errors.push('Missing version field');
  }
  
  if (!data.metadata) {
    errors.push('Missing metadata field');
  } else {
    if (!data.metadata.name) {
      errors.push('Missing ontology name in metadata');
    }
  }
  
  if (!data.entities) {
    errors.push('Missing entities array');
  } else if (!Array.isArray(data.entities)) {
    errors.push('Entities must be an array');
  }
  
  if (!data.relationships) {
    warnings.push('No relationships defined');
    data.relationships = [];
  } else if (!Array.isArray(data.relationships)) {
    errors.push('Relationships must be an array');
  }
  
  // Validate entities
  if (data.entities) {
    data.entities.forEach((entity: any, index: number) => {
      if (!entity.id) {
        errors.push(`Entity at index ${index} is missing an ID`);
      }
      if (!entity.name) {
        errors.push(`Entity at index ${index} is missing a name`);
      }
      if (!entity.type) {
        warnings.push(`Entity "${entity.name}" has no type specified`);
      }
    });
  }
  
  // Validate relationships
  if (data.relationships) {
    data.relationships.forEach((rel: any, index: number) => {
      if (!rel.sourceId || !rel.targetId) {
        errors.push(`Relationship at index ${index} is missing source or target ID`);
      }
      
      // Check if referenced entities exist
      const sourceExists = data.entities.some((e: any) => e.id === rel.sourceId);
      const targetExists = data.entities.some((e: any) => e.id === rel.targetId);
      
      if (!sourceExists) {
        errors.push(`Relationship "${rel.name}" references non-existent source entity: ${rel.sourceId}`);
      }
      if (!targetExists) {
        errors.push(`Relationship "${rel.name}" references non-existent target entity: ${rel.targetId}`);
      }
    });
  }
  
  // Calculate summary
  const propertiesCount = data.entities ? 
    data.entities.reduce((count: number, entity: any) => {
      return count + (entity.properties ? Object.keys(entity.properties).length : 0);
    }, 0) : 0;
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
    warnings,
    summary: {
      entitiesCount: data.entities ? data.entities.length : 0,
      relationshipsCount: data.relationships ? data.relationships.length : 0,
      propertiesCount,
    },
  };
}

/**
 * Convert imported data to ReactFlow format
 */
export function convertImportToReactFlow(data: OntologyExportData): {
  nodes: Node[];
  edges: Edge[];
} {
  // Convert entities to nodes
  const nodes: Node[] = data.entities.map((entity, index) => ({
    id: entity.id,
    type: 'entity',
    position: entity.position || { 
      x: 100 + (index % 5) * 200, 
      y: 100 + Math.floor(index / 5) * 150 
    },
    data: {
      label: entity.name,
      type: entity.type,
      description: entity.description,
      properties: entity.properties,
      isHidden: entity.isHidden,
      validationRules: entity.validationRules,
    },
  }));
  
  // Convert relationships to edges
  const edges: Edge[] = data.relationships.map(rel => ({
    id: rel.id,
    source: rel.sourceId,
    target: rel.targetId,
    type: rel.bidirectional ? 'default' : 'smoothstep',
    data: {
      label: rel.name,
      cardinality: rel.cardinality,
      bidirectional: rel.bidirectional,
      properties: rel.properties,
      description: rel.description,
    },
  }));
  
  return { nodes, edges };
}

/**
 * Export canvas as image (PNG/SVG)
 */
export function exportCanvasAsImage(
  canvasElement: HTMLElement, 
  filename: string, 
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (format === 'png') {
      // For PNG export using html2canvas (would need to install: npm install html2canvas)
      // For now, we'll create a simple implementation
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context not available');
        }
        
        // Set canvas size based on the element
        const rect = canvasElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    } else if (format === 'svg') {
      // For SVG export, extract SVG elements
      try {
        const svgElements = canvasElement.querySelectorAll('svg');
        if (svgElements.length === 0) {
          throw new Error('No SVG elements found in canvas');
        }
        
        // Take the first (main) SVG element
        const svgElement = svgElements[0];
        const svgData = new XMLSerializer().serializeToString(svgElement);
        
        // Create SVG file with proper headers
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('Unsupported export format'));
    }
  });
}

/**
 * Generate a default filename based on ontology name and current date
 */
export function generateExportFilename(ontologyName: string, format: 'json' | 'yaml' | 'png' | 'svg' = 'json'): string {
  const sanitizedName = ontologyName
    .replace(/[^a-z0-9]/gi, ' ') // Replace special characters with spaces
    .replace(/\s+/g, '_') // Replace spaces with single underscore
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${sanitizedName}_${timestamp}.${format}`;
}