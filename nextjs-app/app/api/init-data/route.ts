import { NextResponse } from "next/server"
import path from "path"
import { mockDashboards, mockUsers } from "@/lib/mock/mock-data"

// Mock data paths
const DATA_DIR = path.join(process.cwd(), "data")
const DASHBOARDS_PATH = path.join(DATA_DIR, "dashboards.json")
const ACCESS_REQUESTS_PATH = path.join(DATA_DIR, "access-requests.json")
const USERS_PATH = path.join(DATA_DIR, "users.json")
const DASHBOARD_ACCESS_PATH = path.join(DATA_DIR, "dashboard-access.json")

// In-memory storage for dashboard access
const dashboardAccess: any[] = []

// GET handler
export async function GET() {
  // Initialize dashboard access for admin user
  const ADMIN_USER_ID = "2af311d8-df7a-4881-ac38-4232d4f5959b"

  // Ensure admin user exists
  const adminUser = mockUsers.find((user) => user.id === ADMIN_USER_ID)

  if (!adminUser) {
    // Add admin user if not exists
    mockUsers.push({
      id: ADMIN_USER_ID,
      username: "admin_user",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      roles: ["admin", "developer"],
      isAdmin: true,
    })
  }

  // Grant admin access to all dashboards
  for (const dashboard of mockDashboards) {
    const existingAccess = dashboardAccess.find(
      (access) => access.dashboardId === dashboard.id && access.userId === ADMIN_USER_ID,
    )

    if (!existingAccess) {
      dashboardAccess.push({
        id: Math.random().toString(36).substring(2, 15),
        dashboardId: dashboard.id,
        userId: ADMIN_USER_ID,
        accessLevel: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: "Data initialized successfully",
    adminUser: mockUsers.find((user) => user.id === ADMIN_USER_ID),
    dashboardAccessCount: dashboardAccess.length,
  })
}
