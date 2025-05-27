// lib/types.ts

// Dashboard types
export type DashboardStatus = "draft" | "in_dev" | "qa" | "prod" | "decommissioned"
export type DashboardClassification = "public" | "internal" | "confidential" | "restricted"

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
  }
  
export interface Dashboard {
    id: string
    name: string
    description?: string
    created_at?: string
    updated_at?: string
    created_by?: string
    updated_by?: string
    global_filters?: Record<string, any>
    layout?: {
      dimensions: {
        width: number
        height: number
      }
    }
    data?: {
      items?: DashboardItem[]
      globalFilters?: Record<string, any>
      dimensions?: {
        width: number
        height: number
      }
    }
  
    // Additional fields
    hasAccess?: boolean
    is_favorited_by?: boolean
    status?: string
    classification?: string
    has_pending_request?: boolean
    thumbnail?: string
    owner_id?: string
    tags?: string[]
    is_public?: boolean
    access_roles?: string[]
  }

  export interface DashboardItem {
    id: string
    type: string
    chart_id?: number
    x: number
    y: number
    width: number
    height: number
    config: Record<string, any>
    content: any[] | Record<string, any> 
    title: string
    pageId: string
    zIndex: number
  }

export interface DashboardsResponse {
    dashboards: Dashboard[]
    total: number
    page: number
    pageSize: number
  }

// User types
export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isAdmin?: boolean
  sub?: string
  preferred_username?: string
  realm_access?: {
    roles: string[]
  }
}

// Access request types
export interface AccessRequest {
  id: string
  dataset_id: string
  userId: string
  requestedAt: string
  status: "pending" | "approved" | "rejected"
  reason: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  dashboard?: Dashboard
  user?: User
  reviewer?: User
}

export interface AccessRequestsResponse {
  requests: AccessRequest[]
  total: number
  page: number
  pageSize: number
}

// API response type
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

// Chart types
export interface ChartItem {
    id: number
    type: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    data: any[]
    title: string
    config?: ChartConfig
  }
  
export interface ChartConfig {
    // Common chart properties
    colors?: string[]
    showLegend?: boolean
    legendPosition?: "top" | "right" | "bottom" | "left"
    showGrid?: boolean
    labelKey?: string
    valueKey?: string
    theme?: string
    showDataLabels?: boolean
    scaleType?: "linear" | "log"
    chartStyle?: "default" | "pastel" | "vibrant" | "monochrome" | "gradient"
  
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
  