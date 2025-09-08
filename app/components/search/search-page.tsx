'use client';

import * as React from 'react';
import { SearchInput } from './search-input';
import { SearchResults, type SearchResult } from './search-results';
import { SearchFilters, type SearchFilters as FilterType } from './search-filters';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface SearchPageProps {
  className?: string;
  defaultFilters?: FilterType;
  onSearch?: (query: string, filters?: FilterType) => Promise<{
    results: SearchResult[];
    totalCount: number;
    suggestions?: string[];
  }>;
}

export function SearchPage({
  className,
  defaultFilters = {},
  onSearch,
}: SearchPageProps) {
  const { toast } = useToast();
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<FilterType>(defaultFilters);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const resultsPerPage = filters.limit || 20;

  // Load recent searches from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const addRecentSearch = React.useCallback((searchQuery: string) => {
    setRecentSearches((prev) => {
      const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Default search implementation if not provided
  const defaultSearch = React.useCallback(
    async (searchQuery: string, searchFilters?: FilterType) => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            filters: searchFilters,
            userId: 'user-' + Math.random().toString(36).substr(2, 9),
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform API response to UI format
        const transformedResults: SearchResult[] = data.results.map((r: any) => ({
          id: r.id,
          title: r.title,
          snippet: r.snippet,
          highlightedSnippet: r.highlightedSnippet,
          source: r.source,
          sourceType: r.sourceType,
          score: r.score,
          confidence: r.scoreExplanation?.confidenceLevel,
          url: r.url,
          metadata: r.metadata,
        }));

        return {
          results: transformedResults,
          totalCount: data.totalCount,
          suggestions: data.suggestions,
        };
      } catch (err) {
        console.error('Search error:', err);
        throw err;
      }
    },
    []
  );

  const handleSearch = React.useCallback(
    async (searchQuery: string, searchFilters?: FilterType) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        toast({
          title: 'Invalid search',
          description: 'Please enter at least 2 characters to search.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      setError(null);
      setQuery(searchQuery);
      setCurrentPage(1);
      addRecentSearch(searchQuery);

      try {
        const searchFn = onSearch || defaultSearch;
        const response = await searchFn(searchQuery, searchFilters || filters);
        
        setResults(response.results);
        setTotalCount(response.totalCount);
        setSuggestions(response.suggestions || []);
        
        if (response.results.length === 0) {
          toast({
            title: 'No results found',
            description: 'Try adjusting your search query or filters.',
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during search';
        setError(errorMessage);
        toast({
          title: 'Search failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onSearch, defaultSearch, filters, toast, addRecentSearch]
  );

  const handlePageChange = React.useCallback(
    async (page: number) => {
      setCurrentPage(page);
      // In a real implementation, you would fetch the specific page of results
      // For now, we'll just update the current page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleFiltersChange = React.useCallback(
    (newFilters: FilterType) => {
      setFilters(newFilters);
      // Re-run search if we have a query
      if (query) {
        handleSearch(query, newFilters);
      }
    },
    [query, handleSearch]
  );

  const handleResultClick = React.useCallback(
    (result: SearchResult) => {
      if (result.url) {
        // In a real app, you might use Next.js router
        window.open(result.url, '_blank');
      } else {
        toast({
          title: 'Result selected',
          description: `Viewing: ${result.title}`,
        });
      }
    },
    [toast]
  );

  // Get paginated results
  const paginatedResults = React.useMemo(() => {
    const start = (currentPage - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    return results.slice(start, end);
  }, [results, currentPage, resultsPerPage]);

  return (
    <div className={cn('container mx-auto p-4 space-y-6', className)}>
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Search</h1>
        <SearchInput
          onSearch={handleSearch}
          suggestions={suggestions}
          recentSearches={recentSearches}
          isLoading={isLoading}
          placeholder="Search documents, facts, entities..."
          showDialog={false}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={() => setFilters({})}
            className="sticky top-4"
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <SearchResults
            results={paginatedResults}
            totalCount={totalCount}
            isLoading={isLoading}
            error={error}
            currentPage={currentPage}
            resultsPerPage={resultsPerPage}
            onPageChange={handlePageChange}
            onResultClick={handleResultClick}
            showConfidence={true}
            showScore={false}
          />
        </div>
      </div>
    </div>
  );
}

export default SearchPage;