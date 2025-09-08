// Map table names to their IDs for this specific base
const TABLE_IDS: Record<string, string> = {
  'Ontologies': 'tblupVP410vrQERwa',
  'EntityDefinitions': 'tbloHlpFxnP5CTBEh',
  'EdgeDefinitions': 'tbldR4dKr1EFlgOFZ',
  'TestDatasets': 'tblf5a4g0VhFDlhSo',
  'TestRuns': 'tble8wm5NYNGRPHkC',
  'GraphAssignments': 'tbl2eLfeMmzwRpdMT',
  'FactRatingConfigs': 'tblGxLQO4N3z5Jz9P',
  'FactRatingTests': 'tblLaHGbhn4YbCHDN'
}

class AirtableService {
  private baseId: string = import.meta.env.VITE_AIRTABLE_BASE_ID || 'appvLsaMZqtLc9EIX'
  private apiKey: string = import.meta.env.VITE_AIRTABLE_API_KEY || ''

  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('Airtable API key not configured')
      }
      
      console.log('Testing Airtable connection...')
      console.log('Base ID:', this.baseId)
      console.log('API Key:', this.apiKey ? 'Configured' : 'Missing')
      
      const url = `/api/airtable/v0/${this.baseId}/tblupVP410vrQERwa?maxRecords=1`
      console.log('Testing connection to:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Connection test response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Connection successful, got data:', data)
        return true
      } else {
        const errorText = await response.text()
        console.error('Connection failed:', response.status, errorText)
        throw new Error(`Connection test failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Airtable connection test failed:', error)
      throw error
    }
  }

  async listRecords(tableName: string, options?: { 
    maxRecords?: number
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
  }) {
    try {
      // Use table ID if available, otherwise use table name
      const tableId = TABLE_IDS[tableName] || tableName
      
      const params = new URLSearchParams()
      if (options?.maxRecords) {
        params.append('maxRecords', options.maxRecords.toString())
      }
      if (options?.sort) {
        options.sort.forEach((s, i) => {
          params.append(`sort[${i}][field]`, s.field)
          params.append(`sort[${i}][direction]`, s.direction)
        })
      }
      
      const response = await fetch(
        `/api/airtable/v0/${this.baseId}/${tableId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${tableName}: ${response.status}`)
      }
      
      const data = await response.json()
      
      return data.records.map((record: any) => ({
        id: record.id,
        fields: {
          ...record.fields,
          Name: record.fields.Name || record.fields.name || '',
          Type: record.fields.Type || record.fields.type || '',
          Status: record.fields.Status || record.fields.status || '',
          Created: record.fields.Created || record.fields.created || record.createdTime || new Date().toISOString(),
          createdTime: record.createdTime
        }
      }))
    } catch (error) {
      console.error(`Failed to list records from ${tableName}:`, error)
      return []
    }
  }
}

export const airtableService = new AirtableService()