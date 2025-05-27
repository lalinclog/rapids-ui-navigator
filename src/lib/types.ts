export interface AuthState {
  isAuthenticated: boolean
  token?: string
  refreshToken?: string
  user?: KeycloakUserInfo
  error?: string
}

export interface KeycloakTokenResponse {
  access_token: string
  expires_in: number
  refresh_expires_in: number
  refresh_token: string
  token_type: string
  id_token?: string
  "not-before-policy"?: number
  session_state?: string
  scope?: string
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
  [key: string]: any // For additional claims
}

// Enhanced dataset interfaces to match backend response
export interface Dataset {
  id: number
  name: string
  description?: string
  source_id: number
  source_name?: string
  source_type?: string
  query_type: string
  query_definition: string
  cache_policy?: string | object
  last_refreshed?: string
  last_refreshed_at?: string
  created_at: string
  updated_at: string
  created_by: string
  is_active: boolean
  fields?: Field[]
  schema?: SchemaInfo
  minio_metadata?: MinIOMetadata
  cache_info?: CacheInfo
}

export interface Field {
  id: number
  dataset_id: number
  name: string
  display_name?: string
  field_type: string
  data_type: string
  format_pattern?: string
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface SchemaInfo {
  fields: SchemaField[]
  inferred: boolean
  last_analyzed?: string
  sample_file?: string
}

export interface SchemaField {
  name: string
  type: string
  nullable: boolean
  description?: string
}

export interface MinIOMetadata {
  bucket: string
  prefix: string
  file_type: string
  file_count: number
  total_size: number
  last_modified?: string
  files: MinIOFile[]
}

export interface MinIOFile {
  name: string
  size: number
  last_modified?: string
}

export interface CacheInfo {
  enabled: boolean
  ttl_minutes: number
  auto_refresh: boolean
  last_refreshed?: string
  next_refresh?: string
  status: 'valid' | 'expired' | 'unknown'
}

// Chart types
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

  // Sorting options
  sortBy?: "none" | "asc" | "desc" | "chrono" | "metric"
  sortMetric?: string

  // Padding and margins
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }

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

  // Scatter chart specific
  dotSize?: number
  pointShape?: "circle" | "square" | "triangle" | "diamond" | "star"
  showTrendline?: boolean
  trendlineType?: "linear" | "polynomial" | "exponential"

  // Radar chart specific
  radarFill?: boolean
  radarOpacity?: number

  // Radial chart specific
  radialStartAngle?: number
  radialEndAngle?: number

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

export interface ChartDataPoint {
  label: string | number
  value: number
  [key: string]: any
}

export interface ShadcnChartConfig {
  [key: string]: {
    label?: string
    theme?: {
      light: string
      dark: string
    }
  }
}

// Job types
export type JobStatusType = "pending" | "running" | "completed" | "failed"

export interface BaseJob {
  id: string
  name: string
  type: string
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
  [key: string]: any
}

export interface OperationStat {
  cpuTime?: number
  gpuTime?: number
  speedup?: number
}
