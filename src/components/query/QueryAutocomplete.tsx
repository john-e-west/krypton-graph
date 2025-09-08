import React, { useState, useEffect, useCallback } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Suggestion, AutocompleteContext } from '@/types/query'
import { Clock, Hash, Lightbulb, FileText } from 'lucide-react'

interface QueryAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: Suggestion) => void
  placeholder?: string
  getSuggestions?: (input: string, context: AutocompleteContext) => Promise<Suggestion[]>
}

export const QueryAutocomplete: React.FC<QueryAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing to search...',
  getSuggestions
}) => {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      if (getSuggestions) {
        const context: AutocompleteContext = {
          expecting: 'entity_type',
          currentQuery: input
        }
        const results = await getSuggestions(input, context)
        setSuggestions(results)
      } else {
        const mockSuggestions: Suggestion[] = [
          {
            type: 'template',
            value: `Find all entities of type "${input}"`,
            label: 'Find by Type',
            description: 'Search for entities by type'
          },
          {
            type: 'template',
            value: `Show connections for "${input}"`,
            label: 'Show Connections',
            description: 'Display all relationships'
          },
          {
            type: 'historical',
            value: `${input} AND type:document`,
            label: 'Documents matching query',
            description: 'Previous search (15 results)'
          }
        ]
        setSuggestions(mockSuggestions.filter(s => 
          s.value.toLowerCase().includes(input.toLowerCase())
        ))
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [getSuggestions])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [value, fetchSuggestions])

  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'historical':
        return <Clock className="h-4 w-4" />
      case 'entity_type':
        return <Hash className="h-4 w-4" />
      case 'template':
        return <Lightbulb className="h-4 w-4" />
      case 'attribute':
        return <FileText className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full"
      />
      
      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 w-full z-50">
          <Command className="rounded-lg border shadow-md">
            <CommandList>
              {loading && (
                <CommandEmpty>Loading suggestions...</CommandEmpty>
              )}
              {!loading && suggestions.length === 0 && (
                <CommandEmpty>No suggestions found.</CommandEmpty>
              )}
              
              {suggestions.length > 0 && (
                <>
                  {['template', 'historical', 'entity_type', 'attribute'].map(type => {
                    const typeSuggestions = suggestions.filter(s => s.type === type)
                    if (typeSuggestions.length === 0) return null
                    
                    return (
                      <CommandGroup
                        key={type}
                        heading={
                          type === 'template' ? 'Templates' :
                          type === 'historical' ? 'Recent Searches' :
                          type === 'entity_type' ? 'Entity Types' :
                          'Attributes'
                        }
                      >
                        {typeSuggestions.map((suggestion, index) => (
                          <CommandItem
                            key={`${type}-${index}`}
                            onSelect={() => {
                              onSelect(suggestion)
                              setOpen(false)
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-start gap-2 w-full">
                              <div className="mt-1">
                                {getIcon(suggestion.type)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{suggestion.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {suggestion.description}
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  })}
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}