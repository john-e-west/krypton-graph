import { GraphData, GraphExporterOptions } from './types';

export class GraphExporter {
  exportAsSVG(svg: SVGSVGElement, options?: GraphExporterOptions): Blob {
    const serializer = new XMLSerializer();
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    
    // Add watermark if requested
    if (options?.watermark) {
      const watermark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      watermark.setAttribute('x', '10');
      watermark.setAttribute('y', String(svg.height.baseVal.value - 10));
      watermark.setAttribute('font-size', '12');
      watermark.setAttribute('fill', '#9ca3af');
      watermark.setAttribute('opacity', '0.5');
      watermark.textContent = options.watermark;
      svgClone.appendChild(watermark);
    }
    
    const svgString = serializer.serializeToString(svgClone);
    
    // Add XML declaration and namespace
    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${svgString}`;
    
    return new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
  }
  
  async exportAsPNG(
    svg: SVGSVGElement,
    options?: GraphExporterOptions
  ): Promise<Blob> {
    const width = options?.width || 1920;
    const height = options?.height || 1080;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Convert SVG to image
    const svgBlob = this.exportAsSVG(svg, options);
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate scaling to fit the canvas
        const svgWidth = svg.width.baseVal.value;
        const svgHeight = svg.height.baseVal.value;
        const scale = Math.min(width / svgWidth, height / svgHeight) * 0.9;
        
        const scaledWidth = svgWidth * scale;
        const scaledHeight = svgHeight * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        // Add watermark if requested
        if (options?.watermark) {
          ctx.font = '14px Arial';
          ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
          ctx.fillText(options.watermark, 10, height - 10);
        }
        
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      img.src = url;
    });
  }
  
  async exportWithMetadata(
    svg: SVGSVGElement,
    graph: GraphData,
    options?: GraphExporterOptions
  ): Promise<Blob> {
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    
    // Add metadata element
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
    const rdf = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
               xmlns:dc="http://purl.org/dc/elements/1.1/">
        <rdf:Description rdf:about="">
          <dc:title>Knowledge Graph Export</dc:title>
          <dc:date>${new Date().toISOString()}</dc:date>
          <dc:description>
            Nodes: ${graph.metadata.totalNodes},
            Edges: ${graph.metadata.totalEdges},
            Entity Types: ${graph.metadata.entityTypes.join(', ')},
            Edge Types: ${graph.metadata.edgeTypes.join(', ')}
          </dc:description>
          <dc:creator>Krypton Graph Explorer</dc:creator>
        </rdf:Description>
      </rdf:RDF>
    `;
    metadata.innerHTML = rdf;
    svgClone.insertBefore(metadata, svgClone.firstChild);
    
    // Add watermark if requested
    if (options?.watermark) {
      const watermark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      watermark.setAttribute('x', '10');
      watermark.setAttribute('y', String(svg.height.baseVal.value - 10));
      watermark.setAttribute('font-size', '12');
      watermark.setAttribute('fill', '#9ca3af');
      watermark.setAttribute('opacity', '0.5');
      watermark.textContent = options.watermark;
      svgClone.appendChild(watermark);
    }
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${svgString}`;
    
    return new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
  }
  
  downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  async exportAndDownloadSVG(
    svg: SVGSVGElement,
    filename: string = 'graph-export.svg',
    options?: GraphExporterOptions
  ) {
    const blob = this.exportAsSVG(svg, options);
    this.downloadFile(blob, filename);
  }
  
  async exportAndDownloadPNG(
    svg: SVGSVGElement,
    filename: string = 'graph-export.png',
    options?: GraphExporterOptions
  ) {
    try {
      const blob = await this.exportAsPNG(svg, options);
      this.downloadFile(blob, filename);
    } catch (error) {
      console.error('Failed to export PNG:', error);
      throw error;
    }
  }
  
  async exportAndDownloadWithMetadata(
    svg: SVGSVGElement,
    graph: GraphData,
    filename: string = 'graph-export-metadata.svg',
    options?: GraphExporterOptions
  ) {
    const blob = await this.exportWithMetadata(svg, graph, options);
    this.downloadFile(blob, filename);
  }
}