import React, { useState, useEffect } from 'react';
import { GraphFilters } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface FilterPanelProps {
  entityTypes: string[];
  edgeTypes: string[];
  onFiltersChange: (filters: GraphFilters) => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  entityTypes,
  edgeTypes,
  onFiltersChange,
  className = ''
}) => {
  const [filters, setFilters] = useState<GraphFilters>({
    entityTypes: new Set(),
    edgeTypes: new Set(),
    searchQuery: ''
  });

  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        searchQuery: searchInput
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleEntityTypeToggle = (type: string, checked: boolean) => {
    setFilters(prev => {
      const newEntityTypes = new Set(prev.entityTypes);
      if (checked) {
        newEntityTypes.add(type);
      } else {
        newEntityTypes.delete(type);
      }
      return {
        ...prev,
        entityTypes: newEntityTypes
      };
    });
  };

  const handleEdgeTypeToggle = (type: string, checked: boolean) => {
    setFilters(prev => {
      const newEdgeTypes = new Set(prev.edgeTypes);
      if (checked) {
        newEdgeTypes.add(type);
      } else {
        newEdgeTypes.delete(type);
      }
      return {
        ...prev,
        edgeTypes: newEdgeTypes
      };
    });
  };

  const handleSelectAllEntities = () => {
    setFilters(prev => ({
      ...prev,
      entityTypes: new Set(entityTypes)
    }));
  };

  const handleClearAllEntities = () => {
    setFilters(prev => ({
      ...prev,
      entityTypes: new Set()
    }));
  };

  const handleSelectAllEdges = () => {
    setFilters(prev => ({
      ...prev,
      edgeTypes: new Set(edgeTypes)
    }));
  };

  const handleClearAllEdges = () => {
    setFilters(prev => ({
      ...prev,
      edgeTypes: new Set()
    }));
  };

  const handleReset = () => {
    setFilters({
      entityTypes: new Set(),
      edgeTypes: new Set(),
      searchQuery: ''
    });
    setSearchInput('');
  };

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Filter graph elements</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset filters"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="search" className="text-sm font-medium">
              Search
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search nodes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Entity Types</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllEntities}
                  className="h-6 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllEntities}
                  className="h-6 px-2 text-xs"
                >
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {entityTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`entity-${type}`}
                      checked={filters.entityTypes.has(type)}
                      onCheckedChange={(checked) => 
                        handleEntityTypeToggle(type, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`entity-${type}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
                {entityTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No entity types</p>
                )}
              </div>
            </ScrollArea>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Edge Types</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllEdges}
                  className="h-6 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllEdges}
                  className="h-6 px-2 text-xs"
                >
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {edgeTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edge-${type}`}
                      checked={filters.edgeTypes.has(type)}
                      onCheckedChange={(checked) => 
                        handleEdgeTypeToggle(type, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`edge-${type}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
                {edgeTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No edge types</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};