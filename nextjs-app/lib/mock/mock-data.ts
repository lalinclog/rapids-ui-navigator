import { v4 as uuidv4 } from "uuid"
import type { Dashboard, User, AccessRequest, AccessRequestsResponse, DashboardStatus, DashboardClassification  } from "@/lib/types"

// Admin user ID (provided in the requirements)
export const ADMIN_USER_ID = "2af311d8-df7a-4881-ac38-4232d4f5959b"

// Mock users
export const mockUsers: User[] = [
  {
    id: ADMIN_USER_ID,
    username: "admin_user",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    roles: ["admin", "developer"],
    isAdmin: true,
  },
  {
    id: uuidv4(),
    username: "dev_user",
    email: "dev@example.com",
    firstName: "Developer",
    lastName: "User",
    roles: ["dev"],
    isAdmin: false,
  },
  {
    id: uuidv4(),
    username: "analyst_user",
    email: "analyst@example.com",
    firstName: "Analyst",
    lastName: "User",
    roles: ["analyst"],
    isAdmin: false,
  },
  {
    id: uuidv4(),
    username: "data_steward",
    email: "steward@example.com",
    firstName: "Data",
    lastName: "Steward",
    roles: ["data_steward"],
    isAdmin: false,
  },
]

// Mock dashboards
export const mockDashboards: Dashboard[] = [
  {
    id: "1",
    name: "Sales Performance Dashboard",
    description: "Overview of sales performance across regions and products",
    status: "prod" as DashboardStatus,
    classification: "internal" as DashboardClassification,
    created_at: "2023-01-15T08:30:00Z",
    updated_at: "2023-02-10T14:45:00Z",
    created_by: ADMIN_USER_ID,
    updated_by: ADMIN_USER_ID,
    owner_id: ADMIN_USER_ID,
    tags: ["sales", "performance", "quarterly"],
    is_favorited_by: true,
    hasAccess: true,
    thumbnail: "/placeholder.svg?height=200&width=300",
    data: {
      items: [
        {
          id: "chart1",
          type: "bar-chart",
          title: "Sales by Region",
          chart_id: 1,
          x: 0,
          y: 0,
          width: 6,
          height: 8,
          config: {
            colors: ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c"],
            showLegend: true,
            legendPosition: "right",
            layout: "vertical",
            barRadius: 4,
            labelKey: "region",
            valueKey: "value"
          },
          content: [
            { region: "North America", value: 1200000 },
            { region: "Europe", value: 900000 },
            { region: "Asia Pacific", value: 750000 },
            { region: "Latin America", value: 450000 },
            { region: "Middle East & Africa", value: 300000 },
          ],
          pageId: "main",
          zIndex: 1
        },
        {
          id: "chart2",
          type: "pie-chart",
          title: "Sales by Product Category",
          chart_id: 2,
          x: 6,
          y: 0,
          width: 6,
          height: 8,
          config: {
            colors: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"],
            showLegend: true,
            legendPosition: "bottom",
            pieType: "donut",
            innerRadius: 50,
            labelKey: "category",
            valueKey: "value"
          },
          content: [
            { category: "Electronics", value: 1500000 },
            { category: "Clothing", value: 1200000 },
            { category: "Home & Garden", value: 900000 },
            { category: "Sports & Outdoors", value: 600000 },
            { category: "Books & Media", value: 300000 },
          ],
          pageId: "main",
          zIndex: 2
        },
        {
          id: "chart3",
          type: "line-chart",
          title: "Monthly Sales Trend",
          chart_id: 3,
          x: 0,
          y: 8,
          width: 12,
          height: 8,
          config: {
            colors: ["#8884d8"],
            showLegend: false,
            lineType: "linear",
            lineWidth: 2,
            showDots: true,
            labelKey: "month",
            valueKey: "value",
            xAxis: {
              label: "Month",
              showGrid: true
            },
            yAxis: {
              label: "Sales ($)",
              showGrid: true
            }
          },
          content: [
            { month: "Jan", value: 250000 },
            { month: "Feb", value: 280000 },
            { month: "Mar", value: 310000 },
            { month: "Apr", value: 340000 },
            { month: "May", value: 370000 },
            { month: "Jun", value: 400000 },
            { month: "Jul", value: 430000 },
            { month: "Aug", value: 460000 },
            { month: "Sep", value: 490000 },
            { month: "Oct", value: 520000 },
            { month: "Nov", value: 550000 },
            { month: "Dec", value: 580000 },
          ],
          pageId: "main",
          zIndex: 2
        },
      ],
      globalFilters: {
        dateRange: {
          start: "2023-01-01",
          end: "2023-12-31"
        },
        regions: ["North America", "Europe", "Asia Pacific"]
      },
      dimensions: {
        width: 1200,
        height: 800
      }
    },
    layout: {
      dimensions: {
        width: 1200,
        height: 800
      }
    }
  },
  {
    id: "2",
    name: "Marketing Campaign Analytics",
    description: "Performance metrics for our digital marketing campaigns",
    status: "prod" as DashboardStatus,
    classification: "confidential" as DashboardClassification,
    created_at: "2023-03-05T10:15:00Z",
    updated_at: "2023-03-20T16:30:00Z",
    created_by: ADMIN_USER_ID,
    updated_by: ADMIN_USER_ID,
    owner_id: ADMIN_USER_ID,
    tags: ["marketing", "campaigns", "digital"],
    is_favorited_by: false,
    hasAccess: true,
    thumbnail: "/placeholder.svg?height=200&width=300",
    data: {
      items: [
        {
          id: "chart1",
          type: "line-chart",
          title: "Campaign Performance Over Time",
          chart_id: 1,
          x: 0,
          y: 0,
          width: 12,
          height: 8,
          config: {
            colors: ["#8884d8", "#82ca9d", "#ffc658"],
            showLegend: true,
            legendPosition: "bottom",
            lineType: "linear",
            lineWidth: 2,
            showDots: true,
            labelKey: "date",
            valueKeys: ["impressions", "clicks", "conversions"],
            xAxis: {
              label: "Date",
              showGrid: true
            },
            yAxis: {
              label: "Count",
              showGrid: true
            }
          },
          content: [
            { date: "2023-01-01", impressions: 120000, clicks: 3600, conversions: 720 },
            { date: "2023-02-01", impressions: 150000, clicks: 4500, conversions: 900 },
            { date: "2023-03-01", impressions: 180000, clicks: 5400, conversions: 1080 },
            { date: "2023-04-01", impressions: 210000, clicks: 6300, conversions: 1260 },
            { date: "2023-05-01", impressions: 240000, clicks: 7200, conversions: 1440 },
          ],
          pageId: "main",
          zIndex: 1
        },
        {
          id: "chart2",
          type: "bar-chart",
          title: "Conversion by Channel",
          chart_id: 2,
          x: 0,
          y: 8,
          width: 6,
          height: 8,
          config: {
            colors: ["#8884d8", "#83a6ed", "#8dd1e1"],
            showLegend: true,
            legendPosition: "right",
            layout: "grouped",
            barRadius: 4,
            labelKey: "channel",
            valueKey: "conversionRate"
          },
          content: [
            { channel: "Email", conversionRate: 3.2 },
            { channel: "Social", conversionRate: 2.8 },
            { channel: "Search", conversionRate: 4.1 },
          ],
          pageId: "main",
          zIndex: 1
        },
        {
          id: "chart3",
          type: "pie-chart",
          title: "Budget Allocation",
          chart_id: 1,
          x: 6,
          y: 8,
          width: 6,
          height: 8,
          config: {
            colors: ["#0088FE", "#00C49F", "#FFBB28"],
            showLegend: true,
            legendPosition: "right",
            pieType: "pie",
            labelKey: "category",
            valueKey: "amount"
          },
          content: [
            { category: "Digital Ads", amount: 50000 },
            { category: "Content", amount: 30000 },
            { category: "Events", amount: 20000 },
          ],
          pageId: "main",
          zIndex: 1
        },
      ],
      globalFilters: {
        dateRange: {
          start: "2023-01-01",
          end: "2023-05-31"
        },
        channels: ["Email", "Social", "Search"]
      },
      dimensions: {
        width: 1200,
        height: 800
      }
    },
    layout: {
      dimensions: {
        width: 1200,
        height: 800
      }
    }
  },
]

// Mock dashboard access
export const mockDashboardAccess = mockDashboards.map((dashboard) => ({
  id: uuidv4(),
  dataset_id: dashboard.id,
  userId: ADMIN_USER_ID,
  accessLevel: "admin",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))

// Mock access requests
export const mockAccessRequests: AccessRequest[] = [
  {
    id: "1",
    dataset_id: "4",
    userId: mockUsers[2].id,
    requestedAt: "2023-05-10T14:30:00Z",
    status: "pending",
    reason: "Need access to analyze sales performance for my quarterly report",
    dashboard: {
      id: "4",
      name: "Financial Performance",
      description: "Financial metrics and KPIs",
      status: "prod" as DashboardStatus,
      classification: "restricted" as DashboardClassification,
      created_at: "2023-01-05T11:20:00Z",
      updated_at: "2023-06-20T13:15:00Z",
      created_by: ADMIN_USER_ID,
      updated_by: ADMIN_USER_ID,
      owner_id: ADMIN_USER_ID,
      tags: ["finance", "performance", "metrics"],
      is_favorited_by: true,
      hasAccess: false,
      thumbnail: "/placeholder.svg?height=200&width=300",
      data: {
        items: [],
        globalFilters: {},
        dimensions: {
          width: 1200,
          height: 800
        }
      },
      layout: {
        dimensions: {
          width: 1200,
          height: 800
        }
      }
    },
    user: mockUsers[2],
  },
  {
    id: "2",
    dataset_id: "2",
    userId: mockUsers[3].id,
    requestedAt: "2023-05-12T09:15:00Z",
    status: "approved",
    reason: "Required for marketing budget planning",
    reviewedBy: ADMIN_USER_ID,
    reviewedAt: "2023-05-13T10:45:00Z",
    dashboard: {
      id: "2",
      name: "Marketing Budget Analysis",
      description: "Marketing budget allocation and ROI analysis",
      status: "prod" as DashboardStatus,
      classification: "confidential" as DashboardClassification,
      created_at: "2023-02-15T13:40:00Z",
      updated_at: "2023-06-18T09:25:00Z",
      created_by: mockUsers[1].id,
      updated_by: mockUsers[1].id,
      owner_id: mockUsers[1].id,
      tags: ["marketing", "budget", "roi"],
      is_favorited_by: false,
      hasAccess: true,
      thumbnail: "/placeholder.svg?height=200&width=300",
      data: {
        items: [],
        globalFilters: {},
        dimensions: {
          width: 1200,
          height: 800
        }
      },
      layout: {
        dimensions: {
          width: 1200,
          height: 800
        }
      }
    },
    user: mockUsers[3],
    reviewer: mockUsers[0],
  },
  {
    id: "3",
    dataset_id: "3",
    userId: mockUsers[1].id,
    requestedAt: "2023-05-14T16:20:00Z",
    status: "rejected",
    reason: "Need to analyze customer feedback for product improvements",
    reviewedBy: ADMIN_USER_ID,
    reviewedAt: "2023-05-15T11:30:00Z",
    dashboard: {
      id: "3",
      name: "Executive Summary",
      description: "Executive-level overview of company performance",
      status: "prod" as DashboardStatus,
      classification: "restricted" as DashboardClassification,
      created_at: "2023-01-10T08:15:00Z",
      updated_at: "2023-06-15T14:30:00Z",
      created_by: ADMIN_USER_ID,
      updated_by: ADMIN_USER_ID,
      owner_id: ADMIN_USER_ID,
      tags: ["executive", "summary", "performance"],
      is_favorited_by: false,
      hasAccess: false,
      thumbnail: "/placeholder.svg?height=200&width=300",
      data: {
        items: [],
        globalFilters: {},
        dimensions: {
          width: 1200,
          height: 800
        }
      },
      layout: {
        dimensions: {
          width: 1200,
          height: 800
        }
      }
    },
    user: mockUsers[1],
    reviewer: mockUsers[0],
  },
]

// Mock datasets
export const mockDatasets = [
  {
    id: "sales_by_region",
    name: "Sales by Region",
    description: "Sales data broken down by geographic region",
    data: [
      { region: "North America", value: 1200000 },
      { region: "Europe", value: 900000 },
      { region: "Asia Pacific", value: 750000 },
      { region: "Latin America", value: 450000 },
      { region: "Middle East & Africa", value: 300000 },
    ],
  },
  {
    id: "sales_by_category",
    name: "Sales by Product Category",
    description: "Sales data broken down by product category",
    data: [
      { category: "Electronics", value: 1500000 },
      { category: "Clothing", value: 1200000 },
      { category: "Home & Garden", value: 900000 },
      { category: "Sports & Outdoors", value: 600000 },
      { category: "Books & Media", value: 300000 },
    ],
  },
  {
    id: "monthly_sales",
    name: "Monthly Sales Trend",
    description: "Sales data over the past 12 months",
    data: [
      { month: "Jan", value: 250000 },
      { month: "Feb", value: 280000 },
      { month: "Mar", value: 310000 },
      { month: "Apr", value: 340000 },
      { month: "May", value: 370000 },
      { month: "Jun", value: 400000 },
      { month: "Jul", value: 430000 },
      { month: "Aug", value: 460000 },
      { month: "Sep", value: 490000 },
      { month: "Oct", value: 520000 },
      { month: "Nov", value: 550000 },
      { month: "Dec", value: 580000 },
    ],
  },
  {
    id: "campaign_performance",
    name: "Campaign Performance Over Time",
    description: "Performance metrics for marketing campaigns over time",
    data: [
      { date: "2023-01-01", impressions: 120000, clicks: 3600, conversions: 720 },
      { date: "2023-02-01", impressions: 150000, clicks: 4500, conversions: 900 },
      { date: "2023-03-01", impressions: 180000, clicks: 5400, conversions: 1080 },
      { date: "2023-04-01", impressions: 210000, clicks: 6300, conversions: 1260 },
      { date: "2023-05-01", impressions: 240000, clicks: 7200, conversions: 1440 },
    ],
  },
]

// Mock data manipulation functions
export const getMockDashboardById = (id: string): Dashboard => {
  const dashboard = mockDashboards.find((d) => d.id === id)
  if (!dashboard) {
    throw new Error(`Dashboard with ID ${id} not found`)
  }
  return { ...dashboard }
}

export const createMockDashboard = (dashboard: Partial<Dashboard>): Dashboard => {
  const newDashboard: Dashboard = {
    id: uuidv4(),
    name: dashboard.name || "New Dashboard",
    description: dashboard.description || "",
    status: dashboard.status || "in_dev",
    classification: dashboard.classification || "internal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: ADMIN_USER_ID, // In dev mode, assume current user is admin
    updated_by: ADMIN_USER_ID,
    tags: dashboard.tags || [],
    is_public: dashboard.is_public || false,
    is_favorited_by: false,
    hasAccess: true,
    thumbnail: dashboard.thumbnail || "/placeholder.svg?height=200&width=300",
    data: dashboard.data || {
      layout: [],
      items: [],
    },
  }

  mockDashboards.push(newDashboard)
  return { ...newDashboard }
}

export const updateMockDashboard = (id: string, dashboard: Partial<Dashboard>): Dashboard => {
  const index = mockDashboards.findIndex((d) => d.id === id)
  if (index === -1) {
    throw new Error(`Dashboard with ID ${id} not found`)
  }

  const updatedDashboard = {
    ...mockDashboards[index],
    ...dashboard,
    updated_at: new Date().toISOString(),
    updated_by: ADMIN_USER_ID, // In dev mode, assume current user is admin
  }

  mockDashboards[index] = updatedDashboard
  return { ...updatedDashboard }
}

export const deleteMockDashboard = (id: string): void => {
  const index = mockDashboards.findIndex((d) => d.id === id)
  if (index === -1) {
    throw new Error(`Dashboard with ID ${id} not found`)
  }

  mockDashboards.splice(index, 1)
}

export const toggleMockFavorite = (id: string, is_favorited_by: boolean): void => {
  const dashboard = mockDashboards.find((d) => d.id === id)
  if (!dashboard) {
    throw new Error(`Dashboard with ID ${id} not found`)
  }

  dashboard.is_favorited_by = is_favorited_by
}

export const getMockAccessRequests = (
  page: number,
  pageSize: number,
  filters?: {
    status?: string
    dataset_id?: string
  },
): AccessRequestsResponse => {
  let filteredRequests = [...mockAccessRequests]

  if (filters) {
    if (filters.status && filters.status !== "all") {
      filteredRequests = filteredRequests.filter((r) => r.status === filters.status)
    }

    if (filters.dataset_id) {
      filteredRequests = filteredRequests.filter((r) => r.dataset_id === filters.dataset_id)
    }
  }

  const total = filteredRequests.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex)

  return {
    requests: paginatedRequests,
    total,
    page,
    pageSize,
  }
}

export const createMockAccessRequest = (request: Partial<AccessRequest>): AccessRequest => {
  const dashboard = mockDashboards.find((d) => d.id === request.dataset_id)
  if (!dashboard) {
    throw new Error(`Dashboard with ID ${request.dataset_id} not found`)
  }

  const newRequest: AccessRequest = {
    id: uuidv4(),
    dataset_id: request.dataset_id!,
    userId: "user123", // In dev mode, assume a standard user
    requestedAt: new Date().toISOString(),
    status: "pending",
    reason: request.reason || "Access needed for work purposes",
    dashboard,
    user: mockUsers.find((u) => u.id === "user123") || mockUsers[1],
  }

  mockAccessRequests.push(newRequest)
  return { ...newRequest }
}

export const updateMockAccessRequest = (id: string, request: Partial<AccessRequest>): AccessRequest => {
  const index = mockAccessRequests.findIndex((r) => r.id === id)
  if (index === -1) {
    throw new Error(`Access request with ID ${id} not found`)
  }

  const updatedRequest = {
    ...mockAccessRequests[index],
    ...request,
  }

  // If approving or rejecting, add reviewer info
  if (request.status === "approved" || request.status === "rejected") {
    updatedRequest.reviewedBy = ADMIN_USER_ID
    updatedRequest.reviewedAt = new Date().toISOString()
    updatedRequest.reviewer = mockUsers.find((u) => u.id === ADMIN_USER_ID)

    // If approving, update dashboard access
    if (request.status === "approved") {
      const dashboardIndex = mockDashboards.findIndex((d) => d.id === updatedRequest.dataset_id)
      if (dashboardIndex !== -1) {
        mockDashboards[dashboardIndex].hasAccess = true
      }
    }
  }

  mockAccessRequests[index] = updatedRequest
  return { ...updatedRequest }
}
