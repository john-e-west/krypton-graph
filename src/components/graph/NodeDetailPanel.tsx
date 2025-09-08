import React from 'react';
import { NodeDatum } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Edit, ExternalLink } from 'lucide-react';

interface NodeDetailPanelProps {
  node: NodeDatum | null;
  onClose: () => void;
  onEdit?: (node: NodeDatum) => void;
  className?: string;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  onClose,
  onEdit,
  className = ''
}) => {
  if (!node) return null;

  return (
    <Card className={`w-96 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{node.label}</CardTitle>
            <CardDescription>
              <Badge variant="secondary">{node.type}</Badge>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(node)}
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
              <h4 className="text-sm font-medium mb-2">Node Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{node.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{node.type}</span>
                </div>
                {node.group && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Group:</span>
                    <span>{node.group}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Attributes</h4>
              <div className="space-y-2">
                {Object.entries(node.attributes || {}).map(([key, value]) => (
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
                {Object.keys(node.attributes || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No attributes</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Actions</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    console.log('View connections for', node.id);
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Connections
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};