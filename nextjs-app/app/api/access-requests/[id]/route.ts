import { NextResponse } from "next/server"
import type { AccessRequest } from "@/lib/types"

// Define ADMIN_USER_ID directly here to avoid circular dependencies
const ADMIN_USER_ID = "2af311d8-df7a-4881-ac38-4232d4f5959b"

// In-memory storage for access requests, dashboards, users, and dashboard access
import { mockDashboards, mockUsers } from "@/lib/mock/mock-data"
const accessRequests: AccessRequest[] = []
const dashboardAccess: any[] = []

// PUT handler
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await request.json()

  // Find the request in our in-memory storage
  const requestIndex = accessRequests.findIndex((req) => req.id === id)

  if (requestIndex === -1) {
    return NextResponse.json({ success: false, message: "Access request not found" }, { status: 404 })
  }

  // Update request
  const updatedRequest = {
    ...accessRequests[requestIndex],
    ...body,
  }

  // If approving or rejecting, add reviewer info
  if (body.status === "approved" || body.status === "rejected") {
    updatedRequest.reviewedBy = ADMIN_USER_ID
    updatedRequest.reviewedAt = new Date().toISOString()

    // If approving, update dashboard access
    if (body.status === "approved") {
      // Check if access already exists
      const existingAccess = dashboardAccess.find(
        (a) => a.dashboardId === updatedRequest.dashboardId && a.userId === updatedRequest.userId,
      )

      if (!existingAccess) {
        // Add new access
        dashboardAccess.push({
          id: Math.random().toString(36).substring(2, 9),
          dashboardId: updatedRequest.dashboardId,
          userId: updatedRequest.userId,
          accessLevel: "viewer",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  accessRequests[requestIndex] = updatedRequest

  // Enrich with dashboard and user data for response
  const dashboard = mockDashboards.find((d) => d.id === updatedRequest.dashboardId)
  const user = mockUsers.find((u) => u.id === updatedRequest.userId)
  const reviewer = updatedRequest.reviewedBy ? mockUsers.find((u) => u.id === updatedRequest.reviewedBy) : undefined

  return NextResponse.json({
    success: true,
    data: {
      ...updatedRequest,
      dashboard,
      user,
      reviewer,
    },
  })
}
