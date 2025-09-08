'use client';

import * as React from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface SearchFilters {
  sources?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  minScore?: number;
  confidenceLevels?: ('high' | 'medium' | 'low')[];
  sortBy?: 'relevance' | 'date' | 'source';
  sortOrder?: 'asc' | 'desc';
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset?: () => void;
  availableSources?: { name: string; count: number }[];
  className?: string;
  compact?: boolean;
}

const defaultSources = [
  { name: 'documents', label: 'Documents', icon: '📄' },
  { name: 'facts', label: 'Facts', icon: '💡' },
  { name: 'entities', label: 'Entities', icon: '🏷️' },
];

const confidenceLevels = [
  { value: 'high', label: 'High Confidence', color: 'text-green-600' },
  { value: 'medium', label: 'Medium Confidence', color: 'text-yellow-600' },
  { value: 'low', label: 'Low Confidence', color: 'text-gray-600' },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  onReset,
  availableSources,
  className,
  compact = false,
}: SearchFiltersProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    filters.dateRange
      ? {
          from: new Date(filters.dateRange.start),
          to: new Date(filters.dateRange.end),
        }
      : undefined
  );

  const handleSourceToggle = (source: string) => {
    const currentSources = filters.sources || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];
    
    onFiltersChange({
      ...filters,
      sources: newSources.length > 0 ? newSources : undefined,
    });
  };

  const handleConfidenceToggle = (level: 'high' | 'medium' | 'low') => {
    const current = filters.confidenceLevels || [];
    const newLevels = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    
    onFiltersChange({
      ...filters,
      confidenceLevels: newLevels.length > 0 ? newLevels : undefined,
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: range.from.toISOString(),
          end: range.to.toISOString(),
        },
      });
    } else {
      const { dateRange, ...rest } = filters;
      onFiltersChange(rest);
    }
  };

  const handleMinScoreChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minScore: value[0] > 0 ? value[0] / 100 : undefined,
    });
  };

  const handleLimitChange = (value: string) => {
    onFiltersChange({
      ...filters,
      limit: parseInt(value, 10),
    });
  };

  const handleSortChange = (field: 'sortBy' | 'sortOrder', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.sources?.length) count++;
    if (filters.dateRange) count++;
    if (filters.minScore) count++;
    if (filters.confidenceLevels?.length) count++;
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    onFiltersChange({});
    setDateRange(undefined);
    onReset?.();
  };

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {/* Source badges */}
        {defaultSources.map((source) => (
          <Badge
            key={source.name}
            variant={filters.sources?.includes(source.name) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleSourceToggle(source.name)}
          >
            <span className="mr-1">{source.icon}</span>
            {source.label}
          </Badge>
        ))}
        
        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filters.dateRange ? 'default' : 'outline'}
              size="sm"
              className="h-7"
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {filters.dateRange
                ? `${format(new Date(filters.dateRange.start), 'MMM d')} - ${format(
                    new Date(filters.dateRange.end),
                    'MMM d'
                  )}`
                : 'Date range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        {/* Active filter count and reset */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={handleResetFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>
              Refine your search results
            </CardDescription>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Reset ({activeFilterCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['sources', 'date']} className="w-full">
          {/* Source Types */}
          <AccordionItem value="sources">
            <AccordionTrigger>
              Source Types
              {filters.sources?.length ? (
                <Badge variant="secondary" className="ml-2">
                  {filters.sources.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {defaultSources.map((source) => {
                  const sourceData = availableSources?.find((s) => s.name === source.name);
                  return (
                    <div key={source.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={source.name}
                        checked={filters.sources?.includes(source.name) || false}
                        onCheckedChange={() => handleSourceToggle(source.name)}
                      />
                      <Label
                        htmlFor={source.name}
                        className="flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <span className="flex items-center">
                          <span className="mr-2">{source.icon}</span>
                          {source.label}
                        </span>
                        {sourceData && (
                          <Badge variant="secondary" className="ml-auto">
                            {sourceData.count}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Date Range */}
          <AccordionItem value="date">
            <AccordionTrigger>
              Date Range
              {filters.dateRange && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </AccordionContent>
          </AccordionItem>

          {/* Confidence Level */}
          <AccordionItem value="confidence">
            <AccordionTrigger>
              Confidence Level
              {filters.confidenceLevels?.length ? (
                <Badge variant="secondary" className="ml-2">
                  {filters.confidenceLevels.length}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {confidenceLevels.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={level.value}
                      checked={
                        filters.confidenceLevels?.includes(
                          level.value as 'high' | 'medium' | 'low'
                        ) || false
                      }
                      onCheckedChange={() =>
                        handleConfidenceToggle(level.value as 'high' | 'medium' | 'low')
                      }
                    />
                    <Label
                      htmlFor={level.value}
                      className={cn('cursor-pointer', level.color)}
                    >
                      {level.label}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Minimum Score */}
          <AccordionItem value="score">
            <AccordionTrigger>
              Minimum Score
              {filters.minScore && (
                <Badge variant="secondary" className="ml-2">
                  {Math.round((filters.minScore || 0) * 100)}%
                </Badge>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Min: 0%</span>
                  <span className="font-medium">
                    {Math.round((filters.minScore || 0) * 100)}%
                  </span>
                  <span>Max: 100%</span>
                </div>
                <Slider
                  value={[(filters.minScore || 0) * 100]}
                  onValueChange={handleMinScoreChange}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sort Options */}
          <AccordionItem value="sort">
            <AccordionTrigger>
              Sort Options
              {filters.sortBy && filters.sortBy !== 'relevance' && (
                <Badge variant="secondary" className="ml-2">
                  Custom
                </Badge>
              )}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sortBy">Sort by</Label>
                  <Select
                    value={filters.sortBy || 'relevance'}
                    onValueChange={(value) => handleSortChange('sortBy', value)}
                  >
                    <SelectTrigger id="sortBy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="source">Source</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sortOrder">Order</Label>
                  <Select
                    value={filters.sortOrder || 'desc'}
                    onValueChange={(value) => handleSortChange('sortOrder', value)}
                  >
                    <SelectTrigger id="sortOrder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Results per page */}
          <AccordionItem value="limit">
            <AccordionTrigger>
              Results per page
              <Badge variant="secondary" className="ml-2">
                {filters.limit || 20}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <Select
                value={(filters.limit || 20).toString()}
                onValueChange={handleLimitChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="20">20 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                  <SelectItem value="100">100 results</SelectItem>
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default SearchFilters;