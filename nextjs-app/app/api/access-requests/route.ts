import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import type { AccessRequest } from "@/lib/types"

// In-memory storage for access requests
const accessRequests: AccessRequest[] = []

// In-memory storage for dashboards and users
import { mockDashboards, mockUsers } from "@/lib/mock/mock-data"

// GET handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("page_size") || "10")
  const status = searchParams.get("status")
  const dashboardId = searchParams.get("dashboard_id")

  let requests = [...accessRequests]

  // Apply filters
  if (status && status !== "all") {
    requests = requests.filter((req) => req.status === status)
  }

  if (dashboardId) {
    requests = requests.filter((req) => req.dashboardId === dashboardId)
  }

  // Enrich with dashboard and user data
  requests = requests.map((request) => {
    const dashboard = mockDashboards.find((d) => d.id === request.dashboardId)
    const user = mockUsers.find((u) => u.id === request.userId)
    const reviewer = request.reviewedBy ? mockUsers.find((u) => u.id === request.reviewedBy) : undefined

    return {
      ...request,
      dashboard,
      user,
      reviewer,
    }
  })

  // Paginate
  const total = requests.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedRequests = requests.slice(startIndex, endIndex)

  return NextResponse.json({
    requests: paginatedRequests,
    total,
    page,
    pageSize,
  })
}

// POST handler
export async function POST(request: Request) {
  const body = await request.json()

  // Validate required fields
  if (!body.dashboardId || !body.reason) {
    return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
  }

  // Create new access request
  const newRequest: AccessRequest = {
    id: uuidv4(),
    dashboardId: body.dashboardId,
    userId: body.userId || "user123", // Default user ID for demo
    requestedAt: new Date().toISOString(),
    status: "pending",
    reason: body.reason,
  }

  // Add new request to in-memory storage
  accessRequests.push(newRequest)

  // Enrich with dashboard and user data for response
  const dashboard = mockDashboards.find((d) => d.id === newRequest.dashboardId)
  const user = mockUsers.find((u) => u.id === newRequest.userId)

  return NextResponse.json({
    success: true,
    data: {
      ...newRequest,
      dashboard,
      user,
    },
  })
}
