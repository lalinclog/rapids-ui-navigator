
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
