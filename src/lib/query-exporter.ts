import { QueryResult } from '@/types/query'

export class QueryExporter {
  async exportCSV(result: QueryResult): Promise<Blob> {
    const rows: string[][] = []
    
    // Add headers
    const allKeys = new Set<string>()
    
    result.entities.forEach(entity => {
      Object.keys(entity).forEach(key => allKeys.add(key))
    })
    
    result.edges.forEach(edge => {
      Object.keys(edge).forEach(key => allKeys.add(key))
    })
    
    const headers = ['_type', ...Array.from(allKeys).filter(k => k !== '_type')]
    rows.push(headers)
    
    // Add entity rows
    result.entities.forEach(entity => {
      const row = headers.map(header => {
        if (header === '_type') return 'entity'
        const value = entity[header]
        return this.formatCsvValue(value)
      })
      rows.push(row)
    })
    
    // Add edge rows
    result.edges.forEach(edge => {
      const row = headers.map(header => {
        if (header === '_type') return 'edge'
        const value = edge[header]
        return this.formatCsvValue(value)
      })
      rows.push(row)
    })
    
    const csvContent = rows.map(row => row.join(',')).join('\n')
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  }

  async exportJSON(result: QueryResult): Promise<Blob> {
    const jsonContent = JSON.stringify(result, null, 2)
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  }

  async exportGraphML(result: QueryResult): Promise<Blob> {
    const graphml = this.generateGraphML(result)
    return new Blob([graphml], { type: 'application/xml;charset=utf-8;' })
  }

  async exportGEXF(result: QueryResult): Promise<Blob> {
    const gexf = this.generateGEXF(result)
    return new Blob([gexf], { type: 'application/xml;charset=utf-8;' })
  }

  async exportPajek(result: QueryResult): Promise<Blob> {
    const pajek = this.generatePajek(result)
    return new Blob([pajek], { type: 'text/plain;charset=utf-8;' })
  }

  async exportCypher(result: QueryResult): Promise<Blob> {
    const cypher = this.generateCypher(result)
    return new Blob([cypher], { type: 'text/plain;charset=utf-8;' })
  }

  async exportTurtle(result: QueryResult): Promise<Blob> {
    const turtle = this.generateTurtle(result)
    return new Blob([turtle], { type: 'text/turtle;charset=utf-8;' })
  }

  async exportExcel(result: QueryResult): Promise<Blob> {
    const workbook = await this.generateExcel(result)
    return workbook
  }

  async exportPDF(result: QueryResult): Promise<Blob> {
    const pdf = await this.generatePDF(result)
    return pdf
  }

  async generateShareableLink(result: QueryResult): Promise<string> {
    try {
      const compressed = await this.compressData(result)
      const encoded = btoa(compressed)
      const baseUrl = window.location.origin + window.location.pathname
      return `${baseUrl}?shared=${encoded}`
    } catch (error) {
      throw new Error('Failed to generate shareable link')
    }
  }

  private formatCsvValue(value: any): string {
    if (value === null || value === undefined) return ''
    
    const stringValue = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value)
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    
    return stringValue
  }

  private generateGraphML(result: QueryResult): string {
    const nodeAttributes = this.extractAttributes(result.entities)
    const edgeAttributes = this.extractAttributes(result.edges)
    
    let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">

  <!-- Node attributes -->
`
    
    nodeAttributes.forEach((attr, index) => {
      graphml += `  <key id="n${index}" for="node" attr.name="${attr}" attr.type="string"/>\n`
    })
    
    graphml += `\n  <!-- Edge attributes -->\n`
    
    edgeAttributes.forEach((attr, index) => {
      graphml += `  <key id="e${index}" for="edge" attr.name="${attr}" attr.type="string"/>\n`
    })
    
    graphml += `\n  <graph id="G" edgedefault="directed">\n`
    
    // Add nodes
    result.entities.forEach(entity => {
      graphml += `    <node id="${this.escapeXml(entity.id)}">\n`
      nodeAttributes.forEach((attr, index) => {
        if (entity[attr] !== undefined) {
          graphml += `      <data key="n${index}">${this.escapeXml(String(entity[attr]))}</data>\n`
        }
      })
      graphml += `    </node>\n`
    })
    
    // Add edges
    result.edges.forEach(edge => {
      graphml += `    <edge source="${this.escapeXml(edge.source)}" target="${this.escapeXml(edge.target)}">\n`
      edgeAttributes.forEach((attr, index) => {
        if (edge[attr] !== undefined) {
          graphml += `      <data key="e${index}">${this.escapeXml(String(edge[attr]))}</data>\n`
        }
      })
      graphml += `    </edge>\n`
    })
    
    graphml += `  </graph>\n</graphml>`
    
    return graphml
  }

  private generateGEXF(result: QueryResult): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="directed">
    <nodes>
${result.entities.map(entity => `      <node id="${entity.id}" label="${this.escapeXml(entity.name || entity.id)}"/>`).join('\n')}
    </nodes>
    <edges>
${result.edges.map((edge, index) => `      <edge id="${index}" source="${edge.source}" target="${edge.target}" label="${edge.type || ''}"/>`).join('\n')}
    </edges>
  </graph>
</gexf>`
  }

  private generatePajek(result: QueryResult): string {
    const nodeMap = new Map()
    result.entities.forEach((entity, index) => {
      nodeMap.set(entity.id, index + 1)
    })
    
    let pajek = `*Vertices ${result.entities.length}\n`
    
    result.entities.forEach((entity, index) => {
      pajek += `${index + 1} "${entity.name || entity.id}"\n`
    })
    
    pajek += `*Edges\n`
    
    result.edges.forEach(edge => {
      const sourceIndex = nodeMap.get(edge.source)
      const targetIndex = nodeMap.get(edge.target)
      if (sourceIndex && targetIndex) {
        pajek += `${sourceIndex} ${targetIndex}\n`
      }
    })
    
    return pajek
  }

  private generateCypher(result: QueryResult): string {
    let cypher = '// Create nodes\n'
    
    result.entities.forEach(entity => {
      const props = Object.entries(entity)
        .filter(([key]) => key !== 'id')
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')
      
      cypher += `CREATE (n${entity.id}:${entity.type || 'Node'} {id: "${entity.id}"${props ? ', ' + props : ''}})\n`
    })
    
    cypher += '\n// Create relationships\n'
    
    result.edges.forEach(edge => {
      const props = Object.entries(edge)
        .filter(([key]) => !['id', 'source', 'target', 'type'].includes(key))
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')
      
      cypher += `MATCH (a {id: "${edge.source}"}), (b {id: "${edge.target}"})\n`
      cypher += `CREATE (a)-[:${edge.type || 'RELATES_TO'}${props ? ' {' + props + '}' : ''}]->(b)\n`
    })
    
    return cypher
  }

  private generateTurtle(result: QueryResult): string {
    let turtle = '@prefix : <http://example.org/> .\n'
    turtle += '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n'
    turtle += '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n'
    
    result.entities.forEach(entity => {
      turtle += `:${entity.id} rdf:type :${entity.type || 'Entity'} ;\n`
      
      Object.entries(entity)
        .filter(([key]) => key !== 'id' && key !== 'type')
        .forEach(([key, value]) => {
          turtle += `  :${key} "${value}" ;\n`
        })
      
      turtle = turtle.slice(0, -2) + ' .\n\n'
    })
    
    result.edges.forEach(edge => {
      turtle += `:${edge.source} :${edge.type || 'relatesTo'} :${edge.target} .\n`
    })
    
    return turtle
  }

  private async generateExcel(result: QueryResult): Promise<Blob> {
    // Simplified Excel generation - would need a library like xlsx for full implementation
    const csvContent = await this.exportCSV(result)
    const csvText = await csvContent.text()
    
    // Convert CSV to basic Excel format
    const workbook = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Worksheet ss:Name="Query Results">
    <Table>
${csvText.split('\n').map(row => `      <Row>${row.split(',').map(cell => `<Cell><Data ss:Type="String">${this.escapeXml(cell)}</Data></Cell>`).join('')}</Row>`).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`
    
    return new Blob([workbook], { type: 'application/vnd.ms-excel' })
  }

  private async generatePDF(result: QueryResult): Promise<Blob> {
    // Simplified PDF generation - would need a library like jsPDF for full implementation
    const content = `
Query Results Report
Generated: ${new Date().toLocaleString()}

Entities: ${result.entities.length}
Edges: ${result.edges.length}
Total Results: ${result.metadata.totalResults}
Execution Time: ${result.metadata.executionTime}ms

${JSON.stringify(result, null, 2)}
`
    
    return new Blob([content], { type: 'application/pdf' })
  }

  private extractAttributes(items: any[]): string[] {
    const attributes = new Set<string>()
    items.forEach(item => {
      Object.keys(item).forEach(key => attributes.add(key))
    })
    return Array.from(attributes)
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  private async compressData(data: any): Promise<string> {
    // Simplified compression - would use actual compression in production
    return JSON.stringify(data)
  }
}