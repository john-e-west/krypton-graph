import { ImpactReport, Severity, Impact } from './impact-assessment';

export interface NodeStyle {
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  badge?: {
    text: string;
    color: string;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  animation?: {
    type: 'pulse' | 'glow' | 'shake';
    duration: number;
  };
}

export interface EdgeStyle {
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: string;
  animation?: {
    type: 'flow' | 'pulse';
    duration: number;
  };
}

export interface Annotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  style?: {
    color?: string;
    fontSize?: number;
    fontWeight?: string;
  };
}

export interface LegendConfig {
  title: string;
  items: {
    label: string;
    color: string;
    description?: string;
  }[];
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface ImpactVisualization {
  nodeStyles: Map<string, NodeStyle>;
  edgeStyles: Map<string, EdgeStyle>;
  annotations: Annotation[];
  legend: LegendConfig;
}

export class ImpactVisualizer {
  private severityColors: Record<Severity, string> = {
    CRITICAL: '#ef4444', // red-500
    HIGH: '#f97316',     // orange-500
    MEDIUM: '#eab308',   // yellow-500
    LOW: '#22c55e'       // green-500
  };

  generateImpactStyles(report: ImpactReport): ImpactVisualization {
    const nodeStyles = new Map<string, NodeStyle>();
    const edgeStyles = new Map<string, EdgeStyle>();
    const annotations: Annotation[] = [];
    
    // Style direct impacts
    this.styleDirectImpacts(report.direct, nodeStyles, edgeStyles);
    
    // Style indirect impacts
    this.styleIndirectImpacts(report.indirect, nodeStyles, edgeStyles);
    
    // Style ripple effects
    this.styleRippleEffects(report.ripple, nodeStyles, edgeStyles);
    
    // Generate legend
    const legend = this.generateLegend();
    
    return { nodeStyles, edgeStyles, annotations, legend };
  }

  private styleDirectImpacts(
    impacts: Impact[],
    nodeStyles: Map<string, NodeStyle>,
    edgeStyles: Map<string, EdgeStyle>
  ): void {
    impacts.forEach(impact => {
      const color = this.severityToColor(impact.severity);
      
      if (impact.elementType === 'entity') {
        nodeStyles.set(impact.elementId, {
          borderColor: color,
          borderWidth: 3,
          badge: {
            text: 'Direct',
            color: color,
            position: 'top-right'
          },
          animation: {
            type: 'pulse',
            duration: 1000
          }
        });
      } else if (impact.elementType === 'edge') {
        edgeStyles.set(impact.elementId, {
          color: color,
          width: 3,
          animation: {
            type: 'pulse',
            duration: 1000
          }
        });
      }
    });
  }

  private styleIndirectImpacts(
    impacts: Impact[],
    nodeStyles: Map<string, NodeStyle>,
    edgeStyles: Map<string, EdgeStyle>
  ): void {
    impacts.forEach(impact => {
      const color = this.severityToColor(impact.severity);
      const opacity = 0.8;
      
      if (impact.elementType === 'entity') {
        nodeStyles.set(impact.elementId, {
          borderColor: color,
          borderWidth: 2,
          opacity: opacity,
          badge: {
            text: 'Indirect',
            color: color,
            position: 'top-left'
          }
        });
      } else if (impact.elementType === 'edge') {
        edgeStyles.set(impact.elementId, {
          color: color,
          width: 2,
          opacity: opacity,
          dashArray: '5,5'
        });
      }
    });
  }

  private styleRippleEffects(
    impacts: Impact[],
    nodeStyles: Map<string, NodeStyle>,
    edgeStyles: Map<string, EdgeStyle>
  ): void {
    impacts.forEach(impact => {
      const depth = impact.depth || 0;
      const opacity = Math.max(0.3, 1.0 - (depth * 0.2));
      const color = this.severityToColor(impact.severity);
      
      if (impact.elementType === 'entity') {
        nodeStyles.set(impact.elementId, {
          color: this.adjustColorOpacity(color, opacity),
          borderColor: color,
          borderWidth: 1,
          opacity: opacity,
          badge: {
            text: `L${depth}`,
            color: color,
            position: 'bottom-right'
          }
        });
      } else if (impact.elementType === 'edge') {
        edgeStyles.set(impact.elementId, {
          color: this.adjustColorOpacity(color, opacity),
          width: 1,
          opacity: opacity,
          dashArray: '2,2'
        });
      }
    });
  }

  private severityToColor(severity: Severity): string {
    return this.severityColors[severity];
  }

  private adjustColorOpacity(hexColor: string, opacity: number): string {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  private generateLegend(): LegendConfig {
    return {
      title: 'Impact Severity',
      items: [
        {
          label: 'Critical',
          color: this.severityColors.CRITICAL,
          description: 'Severe impact requiring immediate attention'
        },
        {
          label: 'High',
          color: this.severityColors.HIGH,
          description: 'Significant impact on system'
        },
        {
          label: 'Medium',
          color: this.severityColors.MEDIUM,
          description: 'Moderate impact with manageable consequences'
        },
        {
          label: 'Low',
          color: this.severityColors.LOW,
          description: 'Minor impact with minimal consequences'
        }
      ],
      position: 'top-right'
    };
  }

  generateHeatmap(report: ImpactReport): string {
    // This would generate a base64 encoded heatmap image
    // For now, returning a placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, this.severityColors.LOW);
      gradient.addColorStop(0.5, this.severityColors.MEDIUM);
      gradient.addColorStop(1, this.severityColors.HIGH);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      
      // Add impact points
      const allImpacts = [...report.direct, ...report.indirect, ...report.ripple];
      allImpacts.forEach((impact, index) => {
        const x = (index * 50) % 800;
        const y = Math.floor((index * 50) / 800) * 50;
        const radius = impact.severity === 'CRITICAL' ? 20 : 
                       impact.severity === 'HIGH' ? 15 :
                       impact.severity === 'MEDIUM' ? 10 : 5;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.severityToColor(impact.severity);
        ctx.fill();
      });
    }
    
    return canvas.toDataURL();
  }

  createRippleAnimation(elementId: string, depth: number): Animation {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }
    
    const keyframes = [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.2)', opacity: 0.8 },
      { transform: 'scale(1.4)', opacity: 0.6 },
      { transform: 'scale(1.6)', opacity: 0.4 },
      { transform: 'scale(1.8)', opacity: 0.2 },
      { transform: 'scale(2)', opacity: 0 }
    ];
    
    const options: KeyframeAnimationOptions = {
      duration: 2000 + (depth * 500),
      iterations: Infinity,
      delay: depth * 200
    };
    
    return element.animate(keyframes, options);
  }

  highlightImpactPath(path: string[]): void {
    path.forEach((elementId, index) => {
      const element = document.getElementById(elementId);
      if (element) {
        setTimeout(() => {
          element.classList.add('impact-path-highlight');
          element.style.animationDelay = `${index * 200}ms`;
        }, index * 100);
      }
    });
  }

  clearHighlights(): void {
    const highlightedElements = document.querySelectorAll('.impact-path-highlight');
    highlightedElements.forEach(element => {
      element.classList.remove('impact-path-highlight');
      (element as HTMLElement).style.animationDelay = '';
    });
  }
}