
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'

export interface FilterConfig {
  type: FilterType
  label: string
  key: string
  options?: string[]
  defaultValue?: any
}

export interface FilterValue {
  key: string
  value: any
}
