'use client';

import * as React from 'react';
import { Search, Loader2 } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  onSearch: (query: string, filters?: SearchFilters) => Promise<void>;
  suggestions?: string[];
  recentSearches?: string[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  showDialog?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

interface SearchFilters {
  sources?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export function SearchInput({
  onSearch,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  placeholder = 'Search documents, facts, and more...',
  className,
  showDialog = false,
  onSuggestionClick,
}: SearchInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [localSuggestions, setLocalSuggestions] = React.useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  // Update suggestions when query changes
  React.useEffect(() => {
    if (debouncedQuery.length > 2) {
      // Generate local suggestions based on query
      const querySuggestions = [
        `${debouncedQuery} documentation`,
        `${debouncedQuery} examples`,
        `how to ${debouncedQuery}`,
        `${debouncedQuery} configuration`,
        `${debouncedQuery} tutorial`,
      ].slice(0, 3);
      setLocalSuggestions(querySuggestions);
    } else {
      setLocalSuggestions([]);
    }
  }, [debouncedQuery]);

  const handleSearch = React.useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) return;
      
      setQuery(searchQuery);
      await onSearch(searchQuery);
      setOpen(false);
    },
    [onSearch]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSearch(query);
      }
    },
    [query, handleSearch]
  );

  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      if (onSuggestionClick) {
        onSuggestionClick(suggestion);
      } else {
        handleSearch(suggestion);
      }
    },
    [handleSearch, onSuggestionClick]
  );

  // Toggle between inline and dialog mode
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (showDialog) {
    return (
      <>
        <Button
          variant="outline"
          className={cn(
            'relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64',
            className
          )}
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden lg:inline-flex">Search...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              ) : (
                'No results found.'
              )}
            </CommandEmpty>
            
            {recentSearches.length > 0 && (
              <>
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search) => (
                    <CommandItem
                      key={search}
                      value={search}
                      onSelect={() => handleSuggestionClick(search)}
                    >
                      <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                      {search}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            {(localSuggestions.length > 0 || suggestions.length > 0) && (
              <CommandGroup heading="Suggestions">
                {[...localSuggestions, ...suggestions].map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSuggestionClick(suggestion)}
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </CommandDialog>
      </>
    );
  }

  // Inline search mode
  return (
    <div className={cn('relative w-full', className)}>
      <Command className="rounded-lg border shadow-md">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {(query.length > 0 || recentSearches.length > 0) && (
          <CommandList>
            <CommandEmpty>Start typing to search...</CommandEmpty>
            
            {recentSearches.length > 0 && query.length === 0 && (
              <CommandGroup heading="Recent">
                {recentSearches.slice(0, 5).map((search) => (
                  <CommandItem
                    key={search}
                    value={search}
                    onSelect={() => handleSuggestionClick(search)}
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{search}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {localSuggestions.length > 0 && (
              <CommandGroup heading="Try searching for">
                {localSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSuggestionClick(suggestion)}
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}

// Search input with integrated filters
export function SearchInputWithFilters({
  onSearch,
  className,
  ...props
}: SearchInputProps & {
  onFiltersChange?: (filters: SearchFilters) => void;
}) {
  const [filters, setFilters] = React.useState<SearchFilters>({});
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSearchWithFilters = React.useCallback(
    async (query: string) => {
      await onSearch(query, filters);
    },
    [onSearch, filters]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <SearchInput
          {...props}
          onSearch={handleSearchWithFilters}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <Badge variant="secondary" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0">
            {Object.keys(filters).length}
          </Badge>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {showFilters && (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Sources</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {['documents', 'facts', 'entities'].map((source) => (
                <Badge
                  key={source}
                  variant={filters.sources?.includes(source) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const sources = filters.sources || [];
                    const newSources = sources.includes(source)
                      ? sources.filter((s) => s !== source)
                      : [...sources, source];
                    setFilters({ ...filters, sources: newSources.length ? newSources : undefined });
                  }}
                >
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchInput;