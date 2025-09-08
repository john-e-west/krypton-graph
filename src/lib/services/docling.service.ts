/**
 * Docling PDF conversion service client
 */

export interface ConversionOptions {
  extractImages?: boolean;
  preserveFormatting?: boolean;
}

export interface ConversionResult {
  documentId: string;
  markdown: string;
  images: string[];
  metadata: {
    pageCount: number;
    processingTime: number;
    accuracy: number;
    extractedTables?: number;
    characterCount?: number;
  };
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface ConversionMetrics {
  documentId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  pageCount: number;
  extractedImages: number;
  extractedTables: number;
  characterCount: number;
  accuracyScore: number;
  errors: string[];
}

export class DoclingService {
  private static instance: DoclingService;
  
  private constructor() {}
  
  static getInstance(): DoclingService {
    if (!DoclingService.instance) {
      DoclingService.instance = new DoclingService();
    }
    return DoclingService.instance;
  }
  
  /**
   * Convert PDF to Markdown
   */
  async convertPdfToMarkdown(
    documentId: string,
    filePath: string,
    options?: ConversionOptions
  ): Promise<ConversionResult> {
    try {
      const response = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          filePath,
          options
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.errors?.join(', ') || 'Conversion failed');
      }
      
      return result;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw error;
    }
  }
  
  /**
   * Check if Docling service is available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8001/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Docling service health check failed:', error);
      return false;
    }
  }
  
  /**
   * Calculate conversion quality metrics
   */
  calculateQualityMetrics(result: ConversionResult): ConversionMetrics {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (result.metadata.processingTime * 1000));
    
    return {
      documentId: result.documentId,
      startTime,
      endTime,
      duration: result.metadata.processingTime,
      pageCount: result.metadata.pageCount,
      extractedImages: result.images.length,
      extractedTables: result.metadata.extractedTables || 0,
      characterCount: result.metadata.characterCount || result.markdown.length,
      accuracyScore: result.metadata.accuracy,
      errors: result.errors || []
    };
  }
  
  /**
   * Validate PDF file before conversion
   */
  validatePdfFile(file: File): { valid: boolean; error?: string } {
    if (!file.type || file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }
    
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File is too large (max 100MB)' };
    }
    
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    return { valid: true };
  }
  
  /**
   * Extract document structure from markdown
   */
  extractDocumentStructure(markdown: string): {
    headings: string[];
    tables: number;
    lists: number;
    images: number;
    links: number;
  } {
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    const tableRegex = /\|.*\|.*\n\|[-:\s|]+\|/g;
    const listRegex = /^[\s]*[-*+]\s+|^[\s]*\d+\.\s+/gm;
    const imageRegex = /!\[.*?\]\(.*?\)/g;
    const linkRegex = /\[.*?\]\(.*?\)/g;
    
    const headings: string[] = [];
    let match;
    
    while ((match = headingRegex.exec(markdown)) !== null) {
      headings.push(match[1]);
    }
    
    return {
      headings,
      tables: (markdown.match(tableRegex) || []).length,
      lists: (markdown.match(listRegex) || []).length,
      images: (markdown.match(imageRegex) || []).length,
      links: (markdown.match(linkRegex) || []).length - (markdown.match(imageRegex) || []).length
    };
  }
}

export const doclingService = DoclingService.getInstance();