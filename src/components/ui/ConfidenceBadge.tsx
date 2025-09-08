import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfidenceLevel {
  min: number;
  max: number;
  label: string;
  color: string;
  icon: React.ComponentType<any>;
  description: string;
}

export interface ConfidenceBadgeProps {
  confidence: number;
  showPercentage?: boolean;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
  customLevels?: ConfidenceLevel[];
  className?: string;
  explanation?: string;
  factors?: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    value: number;
  }>;
}

const DEFAULT_CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  {
    min: 0.9,
    max: 1.0,
    label: 'Very High',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Excellent confidence - highly reliable classification'
  },
  {
    min: 0.75,
    max: 0.89,
    label: 'High',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: TrendingUp,
    description: 'Good confidence - classification is likely correct'
  },
  {
    min: 0.6,
    max: 0.74,
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Minus,
    description: 'Moderate confidence - classification may need review'
  },
  {
    min: 0.4,
    max: 0.59,
    label: 'Low',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    description: 'Low confidence - classification should be reviewed'
  },
  {
    min: 0,
    max: 0.39,
    label: 'Very Low',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Very low confidence - classification likely incorrect'
  }
];

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  showPercentage = true,
  showIcon = true,
  showTooltip = true,
  size = 'md',
  variant = 'default',
  customLevels,
  className = '',
  explanation,
  factors = []
}) => {
  const levels = customLevels || DEFAULT_CONFIDENCE_LEVELS;
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));
  
  const level = levels.find(l => 
    normalizedConfidence >= l.min && normalizedConfidence <= l.max
  ) || levels[levels.length - 1];

  const percentage = Math.round(normalizedConfidence * 100);
  const Icon = level.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getFactorIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'negative': return <TrendingDown className="h-3 w-3 text-red-600" />;
      case 'neutral': return <Minus className="h-3 w-3 text-gray-600" />;
      default: return <HelpCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const badgeContent = (
    <Badge
      className={cn(
        level.color,
        sizeClasses[size],
        'inline-flex items-center space-x-1 font-medium border',
        variant === 'minimal' && 'bg-transparent border-current',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>
        {variant === 'detailed' 
          ? `${level.label} (${percentage}%)`
          : showPercentage 
            ? `${percentage}%`
            : level.label
        }
      </span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{level.label} Confidence</span>
            <span className="text-sm">({percentage}%)</span>
          </div>
          
          <p className="text-sm text-gray-600">{level.description}</p>
          
          {explanation && (
            <div className="border-t pt-2">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-xs text-gray-600">{explanation}</p>
            </div>
          )}
          
          {factors.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-sm font-medium mb-2">Contributing Factors:</p>
              <div className="space-y-1">
                {factors.slice(0, 5).map((factor, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      {getFactorIcon(factor.impact)}
                      <span>{factor.factor}</span>
                    </div>
                    <span className="font-mono">
                      {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}
                      {Math.abs(factor.value).toFixed(2)}
                    </span>
                  </div>
                ))}
                {factors.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{factors.length - 5} more factors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Convenience components for common confidence scenarios
export const TypeSuggestionConfidence: React.FC<{
  confidence: number;
  suggestion: string;
  reasoning?: string;
}> = ({ confidence, suggestion, reasoning }) => {
  return (
    <ConfidenceBadge
      confidence={confidence}
      explanation={reasoning || `AI suggested "${suggestion}" with this confidence level`}
      showTooltip
      variant="detailed"
    />
  );
};

export const ClassificationConfidence: React.FC<{
  confidence: number;
  classification: string;
  alternatives?: Array<{ name: string; confidence: number }>;
}> = ({ confidence, classification, alternatives = [] }) => {
  const factors = alternatives.map(alt => ({
    factor: `Alternative: ${alt.name}`,
    impact: alt.confidence > confidence ? 'negative' as const : 'neutral' as const,
    value: alt.confidence
  }));

  return (
    <ConfidenceBadge
      confidence={confidence}
      explanation={`Classification "${classification}" chosen from ${alternatives.length + 1} options`}
      factors={factors}
      showTooltip
    />
  );
};

export const DomainDetectionConfidence: React.FC<{
  confidence: number;
  domain: string;
  indicators: string[];
}> = ({ confidence, domain, indicators }) => {
  const factors = indicators.slice(0, 5).map(indicator => ({
    factor: indicator,
    impact: 'positive' as const,
    value: 0.1 // Simplified - in real implementation would be calculated
  }));

  return (
    <ConfidenceBadge
      confidence={confidence}
      explanation={`Domain "${domain}" detected based on ${indicators.length} indicators`}
      factors={factors}
      showTooltip
      variant="detailed"
    />
  );
};

// Confidence comparison component
export const ConfidenceComparison: React.FC<{
  items: Array<{
    label: string;
    confidence: number;
    isSelected?: boolean;
  }>;
  title?: string;
}> = ({ items, title = "Confidence Comparison" }) => {
  const maxConfidence = Math.max(...items.map(item => item.confidence));

  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={cn(
                "text-sm",
                item.isSelected && "font-medium"
              )}>
                {item.label}
              </span>
              {item.confidence === maxConfidence && (
                <Badge variant="secondary" className="text-xs">
                  Best
                </Badge>
              )}
            </div>
            <ConfidenceBadge
              confidence={item.confidence}
              size="sm"
              showTooltip={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Confidence trend indicator
export const ConfidenceTrend: React.FC<{
  current: number;
  previous?: number;
  label?: string;
}> = ({ current, previous, label = "Confidence" }) => {
  const trend = previous !== undefined ? current - previous : 0;
  const isImproving = trend > 0.05;
  const isDeclining = trend < -0.05;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">{label}:</span>
      <ConfidenceBadge confidence={current} size="sm" showTooltip={false} />
      {previous !== undefined && (
        <div className="flex items-center space-x-1">
          {isImproving && (
            <>
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">
                +{Math.round(trend * 100)}%
              </span>
            </>
          )}
          {isDeclining && (
            <>
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span className="text-xs text-red-600">
                {Math.round(trend * 100)}%
              </span>
            </>
          )}
          {!isImproving && !isDeclining && (
            <Minus className="h-3 w-3 text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
};