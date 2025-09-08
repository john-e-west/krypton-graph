import React from 'react';
import { LinkDatum, NodeDatum } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Edit, ArrowRight } from 'lucide-react';

interface EdgeDetailPanelProps {
  edge: LinkDatum | null;
  onClose: () => void;
  onEdit?: (edge: LinkDatum) => void;
  className?: string;
}

export const EdgeDetailPanel: React.FC<EdgeDetailPanelProps> = ({
  edge,
  onClose,
  onEdit,
  className = ''
}) => {
  if (!edge) return null;

  const sourceNode = edge.source as NodeDatum;
  const targetNode = edge.target as NodeDatum;

  return (
    <Card className={`w-96 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {edge.label || 'Edge'}
            </CardTitle>
            <CardDescription>
              <Badge variant="secondary">{edge.type}</Badge>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(edge)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Edge Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{edge.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{edge.type}</span>
                </div>
                {edge.strength !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strength:</span>
                    <span>{edge.strength}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Connection</h4>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Source</div>
                  <div className="text-sm font-medium">
                    {sourceNode?.label || sourceNode?.id || 'Unknown'}
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {sourceNode?.type || 'Unknown'}
                  </Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Target</div>
                  <div className="text-sm font-medium">
                    {targetNode?.label || targetNode?.id || 'Unknown'}
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {targetNode?.type || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Attributes</h4>
              <div className="space-y-2">
                {Object.entries(edge.attributes || {}).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      {key}:
                    </div>
                    <div className="text-sm pl-2">
                      {typeof value === 'object' ? (
                        <pre className="text-xs bg-muted p-2 rounded">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(edge.attributes || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No attributes</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};