import { ImpactReport, Impact } from './impact-assessment';
import jsPDF from 'jspdf';

export interface GraphSnapshot {
  entities: any[];
  edges: any[];
  timestamp: Date;
}

export interface Change {
  type: 'ADD' | 'MODIFY' | 'DELETE';
  element: 'entity' | 'edge';
  id: string;
  before: any | null;
  after: any | null;
  diff?: any;
}

export interface ChangeComparison {
  before: GraphSnapshot;
  after: GraphSnapshot;
  changes: Change[];
  summary: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export class ImpactReportGenerator {
  async generateReport(
    assessment: ImpactReport,
    format: 'json' | 'pdf' | 'html'
  ): Promise<Blob> {
    switch (format) {
      case 'json':
        return this.generateJSON(assessment);
      
      case 'pdf':
        return this.generatePDF(assessment);
      
      case 'html':
        return this.generateHTML(assessment);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateJSON(assessment: ImpactReport): Blob {
    const json = JSON.stringify(assessment, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  private async generatePDF(assessment: ImpactReport): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title Page
    doc.setFontSize(24);
    doc.text('Impact Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    doc.setFontSize(12);
    doc.text(`Report ID: ${assessment.id}`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Date: ${assessment.timestamp.toLocaleString()}`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Operation: ${assessment.operation.type}`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Overall Confidence: ${(assessment.confidence.overall * 100).toFixed(1)}%`, margin, yPosition);

    // Executive Summary
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(18);
    doc.text('Executive Summary', margin, yPosition);
    
    yPosition += 15;
    doc.setFontSize(12);
    const summaryText = this.generateExecutiveSummary(assessment);
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
    doc.text(summaryLines, margin, yPosition);

    // Impact Statistics
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(18);
    doc.text('Impact Statistics', margin, yPosition);
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.text(`Total Affected Elements: ${assessment.statistics.totalAffected}`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Maximum Impact Depth: ${assessment.statistics.maxDepth}`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Graph Coverage: ${assessment.statistics.percentageOfGraph.toFixed(2)}%`, margin, yPosition);
    
    yPosition += 15;
    doc.text('Impact by Severity:', margin, yPosition);
    yPosition += 10;
    
    Object.entries(assessment.statistics.bySeverity).forEach(([severity, count]) => {
      doc.text(`  • ${severity}: ${count}`, margin + 10, yPosition);
      yPosition += 8;
    });

    // Direct Impacts
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(18);
    doc.text('Direct Impacts', margin, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    this.addImpactsList(doc, assessment.direct, margin, yPosition);

    // Indirect Impacts
    if (assessment.indirect.length > 0) {
      doc.addPage();
      yPosition = margin;
      doc.setFontSize(18);
      doc.text('Indirect Impacts', margin, yPosition);
      
      yPosition += 15;
      doc.setFontSize(10);
      this.addImpactsList(doc, assessment.indirect, margin, yPosition);
    }

    // Ripple Effects
    if (assessment.ripple.length > 0) {
      doc.addPage();
      yPosition = margin;
      doc.setFontSize(18);
      doc.text('Ripple Effects', margin, yPosition);
      
      yPosition += 15;
      doc.setFontSize(10);
      this.addImpactsList(doc, assessment.ripple, margin, yPosition);
    }

    // Confidence Analysis
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(18);
    doc.text('Confidence Analysis', margin, yPosition);
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.text(`Overall Confidence: ${(assessment.confidence.overall * 100).toFixed(1)}%`, margin, yPosition);
    
    yPosition += 10;
    doc.text(`Confidence Range: ${(assessment.confidence.range.min * 100).toFixed(1)}% - ${(assessment.confidence.range.max * 100).toFixed(1)}%`, margin, yPosition);
    
    yPosition += 15;
    doc.text('Contributing Factors:', margin, yPosition);
    yPosition += 10;
    
    Object.entries(assessment.confidence.factors).forEach(([factor, value]) => {
      if (value !== null) {
        doc.text(`  • ${factor}: ${(value * 100).toFixed(1)}%`, margin + 10, yPosition);
        yPosition += 8;
      }
    });

    // Convert to blob
    const pdfOutput = doc.output('blob');
    return pdfOutput;
  }

  private generateHTML(assessment: ImpactReport): Blob {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Impact Assessment Report - ${assessment.id}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #2563eb;
        }
        .stat-label {
            color: #6b7280;
            margin-top: 5px;
        }
        .severity-critical { color: #ef4444; }
        .severity-high { color: #f97316; }
        .severity-medium { color: #eab308; }
        .severity-low { color: #22c55e; }
        .impact-list {
            list-style: none;
            padding: 0;
        }
        .impact-item {
            background: #f9fafb;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            border-left: 4px solid;
        }
        .impact-item.critical { border-left-color: #ef4444; }
        .impact-item.high { border-left-color: #f97316; }
        .impact-item.medium { border-left-color: #eab308; }
        .impact-item.low { border-left-color: #22c55e; }
        .confidence-bar {
            background: #e5e7eb;
            height: 30px;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
        }
        .confidence-fill {
            background: linear-gradient(90deg, #22c55e, #16a34a);
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .summary-box {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Impact Assessment Report</h1>
        <p>Report ID: ${assessment.id}</p>
        <p>Generated: ${assessment.timestamp.toLocaleString()}</p>
        <p>Operation: ${assessment.operation.type}</p>
    </div>

    <div class="summary-box">
        <h2>Executive Summary</h2>
        <p>${this.generateExecutiveSummary(assessment)}</p>
    </div>

    <h2>Impact Statistics</h2>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${assessment.statistics.totalAffected}</div>
            <div class="stat-label">Total Affected Elements</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${assessment.statistics.maxDepth}</div>
            <div class="stat-label">Maximum Impact Depth</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${assessment.statistics.percentageOfGraph.toFixed(1)}%</div>
            <div class="stat-label">Graph Coverage</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(assessment.confidence.overall * 100).toFixed(1)}%</div>
            <div class="stat-label">Confidence Score</div>
        </div>
    </div>

    <h2>Impact by Severity</h2>
    <div class="stats-grid">
        ${Object.entries(assessment.statistics.bySeverity)
          .map(([severity, count]) => `
            <div class="stat-card">
                <div class="stat-value severity-${severity.toLowerCase()}">${count}</div>
                <div class="stat-label">${severity}</div>
            </div>
          `).join('')}
    </div>

    <h2>Direct Impacts</h2>
    <ul class="impact-list">
        ${assessment.direct.map(impact => this.generateImpactHTML(impact)).join('')}
    </ul>

    ${assessment.indirect.length > 0 ? `
    <h2>Indirect Impacts</h2>
    <ul class="impact-list">
        ${assessment.indirect.map(impact => this.generateImpactHTML(impact)).join('')}
    </ul>
    ` : ''}

    ${assessment.ripple.length > 0 ? `
    <h2>Ripple Effects</h2>
    <ul class="impact-list">
        ${assessment.ripple.map(impact => this.generateImpactHTML(impact)).join('')}
    </ul>
    ` : ''}

    <h2>Confidence Analysis</h2>
    <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${assessment.confidence.overall * 100}%">
            ${(assessment.confidence.overall * 100).toFixed(1)}%
        </div>
    </div>
    <p>Confidence Range: ${(assessment.confidence.range.min * 100).toFixed(1)}% - ${(assessment.confidence.range.max * 100).toFixed(1)}%</p>

    <h3>Contributing Factors</h3>
    <ul>
        ${Object.entries(assessment.confidence.factors)
          .filter(([_, value]) => value !== null)
          .map(([factor, value]) => `
            <li>${factor}: ${((value as number) * 100).toFixed(1)}%</li>
          `).join('')}
    </ul>
</body>
</html>
    `;

    return new Blob([html], { type: 'text/html' });
  }

  private generateExecutiveSummary(assessment: ImpactReport): string {
    const totalImpacts = assessment.statistics.totalAffected;
    const criticalCount = assessment.statistics.bySeverity.CRITICAL || 0;
    const highCount = assessment.statistics.bySeverity.HIGH || 0;
    
    let summary = `This ${assessment.operation.type} operation will affect ${totalImpacts} elements across the graph, `;
    summary += `representing ${assessment.statistics.percentageOfGraph.toFixed(1)}% of the total graph. `;
    
    if (criticalCount > 0) {
      summary += `There are ${criticalCount} critical impacts that require immediate attention. `;
    }
    
    if (highCount > 0) {
      summary += `${highCount} high-severity impacts have been identified. `;
    }
    
    summary += `The impact ripples through ${assessment.statistics.maxDepth} levels of connected elements. `;
    summary += `Confidence in this assessment is ${(assessment.confidence.overall * 100).toFixed(0)}%.`;
    
    return summary;
  }

  private generateImpactHTML(impact: Impact): string {
    return `
        <li class="impact-item ${impact.severity.toLowerCase()}">
            <strong>${impact.elementType} - ${impact.elementId}</strong><br>
            Type: ${impact.type}<br>
            Severity: <span class="severity-${impact.severity.toLowerCase()}">${impact.severity}</span><br>
            Confidence: ${(impact.confidence * 100).toFixed(1)}%
            ${impact.cause ? `<br>Caused by: ${impact.cause}` : ''}
            ${impact.depth ? `<br>Depth: Level ${impact.depth}` : ''}
        </li>
    `;
  }

  private addImpactsList(
    doc: jsPDF,
    impacts: Impact[],
    margin: number,
    startY: number
  ): void {
    let yPosition = startY;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    impacts.forEach((impact, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }
      
      const impactText = `${index + 1}. ${impact.elementType} - ${impact.elementId} (${impact.type})`;
      doc.text(impactText, margin, yPosition);
      yPosition += 6;
      
      doc.text(`   Severity: ${impact.severity} | Confidence: ${(impact.confidence * 100).toFixed(1)}%`, margin, yPosition);
      yPosition += 8;
    });
  }
}

export class ChangeComparisonEngine {
  compareGraphStates(
    before: GraphSnapshot,
    after: GraphSnapshot
  ): ChangeComparison {
    const changes: Change[] = [];
    
    // Find deleted entities
    before.entities.forEach(entity => {
      if (!after.entities.find(e => e.id === entity.id)) {
        changes.push({
          type: 'DELETE',
          element: 'entity',
          id: entity.id,
          before: entity,
          after: null
        });
      }
    });
    
    // Find added entities
    after.entities.forEach(entity => {
      if (!before.entities.find(e => e.id === entity.id)) {
        changes.push({
          type: 'ADD',
          element: 'entity',
          id: entity.id,
          before: null,
          after: entity
        });
      }
    });
    
    // Find modified entities
    before.entities.forEach(beforeEntity => {
      const afterEntity = after.entities.find(e => e.id === beforeEntity.id);
      if (afterEntity && !this.deepEqual(beforeEntity, afterEntity)) {
        changes.push({
          type: 'MODIFY',
          element: 'entity',
          id: beforeEntity.id,
          before: beforeEntity,
          after: afterEntity,
          diff: this.generateDiff(beforeEntity, afterEntity)
        });
      }
    });
    
    // Repeat for edges
    before.edges.forEach(edge => {
      if (!after.edges.find(e => e.id === edge.id)) {
        changes.push({
          type: 'DELETE',
          element: 'edge',
          id: edge.id,
          before: edge,
          after: null
        });
      }
    });
    
    after.edges.forEach(edge => {
      if (!before.edges.find(e => e.id === edge.id)) {
        changes.push({
          type: 'ADD',
          element: 'edge',
          id: edge.id,
          before: null,
          after: edge
        });
      }
    });
    
    before.edges.forEach(beforeEdge => {
      const afterEdge = after.edges.find(e => e.id === beforeEdge.id);
      if (afterEdge && !this.deepEqual(beforeEdge, afterEdge)) {
        changes.push({
          type: 'MODIFY',
          element: 'edge',
          id: beforeEdge.id,
          before: beforeEdge,
          after: afterEdge,
          diff: this.generateDiff(beforeEdge, afterEdge)
        });
      }
    });
    
    return {
      before,
      after,
      changes,
      summary: {
        added: changes.filter(c => c.type === 'ADD').length,
        modified: changes.filter(c => c.type === 'MODIFY').length,
        deleted: changes.filter(c => c.type === 'DELETE').length
      }
    };
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  private generateDiff(before: any, after: any): any {
    const diff: any = {};
    
    // Find changed properties
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    allKeys.forEach(key => {
      if (!(key in before)) {
        diff[key] = { added: after[key] };
      } else if (!(key in after)) {
        diff[key] = { removed: before[key] };
      } else if (!this.deepEqual(before[key], after[key])) {
        diff[key] = { before: before[key], after: after[key] };
      }
    });
    
    return diff;
  }
}