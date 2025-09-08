'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  FileText,
  Info,
  Tag,
  Calendar,
  User,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  highlightedSnippet?: string;
  source: string;
  sourceType: 'document' | 'fact' | 'entity';
  sourceIcon?: string;
  score: number;
  confidence?: 'high' | 'medium' | 'low';
  url?: string;
  metadata?: {
    date?: string;
    author?: string;
    tags?: string[];
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  totalCount: number;
  isLoading?: boolean;
  error?: string | null;
  currentPage?: number;
  resultsPerPage?: number;
  onPageChange?: (page: number) => void;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
  showConfidence?: boolean;
  showScore?: boolean;
}

const sourceIcons = {
  document: FileText,
  fact: Info,
  entity: Tag,
};

const confidenceColors = {
  high: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-gray-600 bg-gray-50 border-gray-200',
};

const confidenceLabels = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

export function SearchResults({
  results,
  totalCount,
  isLoading = false,
  error = null,
  currentPage = 1,
  resultsPerPage = 20,
  onPageChange,
  onResultClick,
  className,
  showConfidence = true,
  showScore = false,
}: SearchResultsProps) {
  const totalPages = Math.ceil(totalCount / resultsPerPage);

  if (isLoading) {
    return <SearchResultsSkeleton count={3} />;
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <AlertCircle className="mr-2 h-5 w-5" />
            Search Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className={cn('text-center', className)}>
        <CardHeader>
          <CardTitle>No Results Found</CardTitle>
          <CardDescription>
            Try adjusting your search query or filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground space-y-2">
            <p>Suggestions:</p>
            <ul className="text-sm text-left max-w-md mx-auto space-y-1">
              <li>• Check your spelling</li>
              <li>• Try using different keywords</li>
              <li>• Use more general terms</li>
              <li>• Remove filters to broaden your search</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * resultsPerPage + 1}-
          {Math.min(currentPage * resultsPerPage, totalCount)} of {totalCount} results
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {results.filter((r) => r.sourceType === 'document').length} Documents
          </Badge>
          <Badge variant="secondary">
            {results.filter((r) => r.sourceType === 'fact').length} Facts
          </Badge>
          <Badge variant="secondary">
            {results.filter((r) => r.sourceType === 'entity').length} Entities
          </Badge>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map((result) => (
          <SearchResultCard
            key={result.id}
            result={result}
            onClick={() => onResultClick?.(result)}
            showConfidence={showConfidence}
            showScore={showScore}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange?.(currentPage - 1);
                }}
                className={cn(
                  currentPage === 1 && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
            
            {generatePaginationItems(currentPage, totalPages).map((item, index) => (
              <PaginationItem key={index}>
                {item === '...' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange?.(item as number);
                    }}
                    isActive={currentPage === item}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange?.(currentPage + 1);
                }}
                className={cn(
                  currentPage === totalPages && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function SearchResultCard({
  result,
  onClick,
  showConfidence,
  showScore,
}: {
  result: SearchResult;
  onClick?: () => void;
  showConfidence?: boolean;
  showScore?: boolean;
}) {
  const Icon = sourceIcons[result.sourceType] || FileText;
  const confidence = result.confidence || 'medium';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        onClick && 'hover:border-primary'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {result.title}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <span>{result.source}</span>
              {result.metadata?.date && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(result.metadata.date).toLocaleDateString()}
                  </span>
                </>
              )}
              {result.metadata?.author && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {result.metadata.author}
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showScore && (
              <Badge variant="outline" className="font-mono">
                {result.score}%
              </Badge>
            )}
            {showConfidence && (
              <Badge
                className={cn(
                  'border',
                  confidenceColors[confidence]
                )}
              >
                {confidence === 'high' && <TrendingUp className="mr-1 h-3 w-3" />}
                {confidenceLabels[confidence]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div
          className="text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{
            __html: result.highlightedSnippet || result.snippet,
          }}
        />
        
        {result.metadata?.tags && result.metadata.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {result.metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      
      {result.url && (
        <CardFooter className="pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              window.open(result.url, '_blank');
            }}
          >
            View Details
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mt-2" />
            <Skeleton className="h-4 w-4/6 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function generatePaginationItems(
  currentPage: number,
  totalPages: number
): (number | string)[] {
  const items: (number | string)[] = [];
  const maxVisible = 5;
  
  if (totalPages <= maxVisible + 2) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    // Always show first page
    items.push(1);
    
    if (currentPage > 3) {
      items.push('...');
    }
    
    // Show pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      items.push('...');
    }
    
    // Always show last page
    items.push(totalPages);
  }
  
  return items;
}

export default SearchResults;