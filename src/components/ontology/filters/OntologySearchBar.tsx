import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../../ui/input'

interface OntologySearchBarProps {
  onSearch: (searchTerm: string) => void
  placeholder?: string
}

export const OntologySearchBar: React.FC<OntologySearchBarProps> = ({
  onSearch,
  placeholder = "Search ontologies..."
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, onSearch])

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}