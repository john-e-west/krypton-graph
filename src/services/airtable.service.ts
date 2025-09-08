export interface AirtableRecord {
  id: string
  fields: Record<string, any>
  createdTime?: string
}

export interface AirtableListOptions {
  filterByFormula?: string
  maxRecords?: number
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  view?: string
}

export class AirtableService {
  private baseId: string = ''
  
  constructor() {
    this.baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || ''
  }
  
  async createRecords(table: string, records: Array<{ fields: Record<string, any> }>): Promise<AirtableRecord[]> {
    console.log(`Creating ${records.length} records in ${table}`)
    
    return records.map((record, index) => ({
      id: `rec${Date.now()}${index}`,
      fields: record.fields,
      createdTime: new Date().toISOString()
    }))
  }
  
  async listRecords(table: string, options?: AirtableListOptions): Promise<AirtableRecord[]> {
    console.log(`Listing records from ${table}`, options)
    
    return []
  }
  
  async getRecord(table: string, recordId: string): Promise<AirtableRecord | null> {
    console.log(`Getting record ${recordId} from ${table}`)
    
    return null
  }
  
  async updateRecord(table: string, recordId: string, fields: Record<string, any>): Promise<AirtableRecord> {
    console.log(`Updating record ${recordId} in ${table}`)
    
    return {
      id: recordId,
      fields,
      createdTime: new Date().toISOString()
    }
  }
  
  async deleteRecords(table: string, recordIds: string[]): Promise<void> {
    console.log(`Deleting ${recordIds.length} records from ${table}`)
  }
  
  async searchRecords(table: string, searchTerm: string, _fields?: string[]): Promise<AirtableRecord[]> {
    console.log(`Searching for "${searchTerm}" in ${table}`)
    
    return []
  }
}

export const airtableService = new AirtableService()