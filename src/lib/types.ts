
export interface DashboardItem {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  content: any[]
  config: Record<string, any>
  title: string
  pageId: string
  zIndex: number
  chart_id?: string | null
}

export interface Dashboard {
  id: string
  name: string
  description: string
  data?: any
  global_filters?: Record<string, any>
  layout?: any
}

export interface ChartItem {
  id: number
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  data: any[]
  config: Record<string, any>
}

// Chart configuration interface
export interface ChartConfig {
  colors?: string[]
  showLegend?: boolean
  legendPosition?: "top" | "right" | "bottom" | "left"
  showGrid?: boolean
  showTooltip?: boolean
  labelKey?: string
  valueKey?: string
  theme?: string
  showDataLabels?: boolean
  scaleType?: "linear" | "log"
  chartStyle?: "default" | "pastel" | "vibrant" | "monochrome" | "gradient"
  title?: string
  
  // Bar chart specific
  layout?: "vertical" | "horizontal" | "grouped" | "stacked"
  barRadius?: number
  barGap?: number
  barWidth?: number
  
  // Line chart specific
  lineType?: "linear" | "curved" | "step"
  lineWidth?: number
  showDots?: boolean
  
  // Pie chart specific
  pieType?: "pie" | "donut" | "semi"
  innerRadius?: number
  outerRadius?: number
  donutSize?: number
  explodeSlices?: boolean
  explodeOffset?: number
  
  // Area chart specific
  areaType?: "default" | "stacked" | "percent"
  fillOpacity?: number
  
  // Axes configuration
  xAxis?: {
    label?: string
    unit?: string
    showGrid?: boolean
    min?: number | "auto"
    max?: number | "auto"
  }
  yAxis?: {
    label?: string
    unit?: string
    showGrid?: boolean
    min?: number | "auto"
    max?: number | "auto"
  }
  
  // Interactivity
  enableZoom?: boolean
  filterOnClick?: boolean
  crossChartInteraction?: boolean
}

// Job-related types
export type JobStatusType = 'pending' | 'running' | 'completed' | 'failed'

export interface BaseJob {
  id: string
  name: string
  type: 'qualification' | 'profiling'
  status: JobStatusType
  progress?: number
  start_time?: string
  end_time?: string
  user?: string
  application_name?: string
  results?: JobResults | string
}

export interface JobResults {
  speedupFactor?: number
  resourceSavings?: number
  recommendations?: string[] | string
  operationStats?: Record<string, OperationStat>
}

export interface OperationStat {
  cpuTime?: number
  gpuTime?: number
  speedup?: number
}

// Auth types
export interface KeycloakTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

export interface KeycloakUserInfo {
  sub: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  email?: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  roles?: string[]
}

// Filter types
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'

export interface FilterConfig {
  type: FilterType
  label: string
  key: string
  options?: string[]
  defaultValue?: any
}
