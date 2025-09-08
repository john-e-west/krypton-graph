import React from 'react'
import { SemanticSearch } from '@/components/search/SemanticSearch'
import { useNavigate } from 'react-router-dom'

const Search = () => {
  const navigate = useNavigate()

  const handleResultSelect = (result: any) => {
    console.log('Selected result:', result)
    // Navigate to the appropriate page based on result type
    if (result.type === 'document') {
      navigate('/documents')
    } else if (result.type === 'entity' || result.type === 'edge') {
      navigate('/graphs')
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <SemanticSearch onResultSelect={handleResultSelect} />
    </div>
  )
}

export default Search