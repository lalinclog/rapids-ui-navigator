export interface FilterType {
    id: string
    name: string
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'string'
    field: string
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'
    value: any
    options?: string[] // For select/multiselect filters
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  export interface FilterGroup {
    id: string
    name: string
    filters: FilterType[]
    operator: 'AND' | 'OR'
    isActive: boolean
  }
  
  export interface FilterState {
    filters: FilterType[]
    groups: FilterGroup[]
    activeFilters: string[]
    globalOperator: 'AND' | 'OR'
  }
  
  export type FilterOperator = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'
  export type FilterValueType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'
  
