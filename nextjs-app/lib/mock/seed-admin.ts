import { v4 as uuidv4 } from "uuid"
import { mockUsers, mockDashboards, ADMIN_USER_ID } from "./mock-data"

// In-memory storage for dashboard access
const dashboardAccess: any[] = []

// Seed admin user
export function seedAdminUser() {
  const existingUser = mockUsers.find((user) => user.id === ADMIN_USER_ID)

  if (!existingUser) {
    const adminUser = {
      id: ADMIN_USER_ID,
      username: "admin_user",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      roles: ["admin", "developer"],
      isAdmin: true,
    }

    mockUsers.push(adminUser)
    console.log("Admin user seeded")
    return adminUser
  }

  console.log("Admin user already exists")
  return existingUser
}

// Seed dashboard access
export function seedDashboardAccess() {
  let updated = false

  for (const dashboard of mockDashboards) {
    const existingAccess = dashboardAccess.find(
      (access) => access.dashboardId === dashboard.id && access.userId === ADMIN_USER_ID,
    )

    if (!existingAccess) {
      dashboardAccess.push({
        id: uuidv4(),
        dashboardId: dashboard.id,
        userId: ADMIN_USER_ID,
        accessLevel: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      updated = true
    }
  }

  if (updated) {
    console.log("Admin dashboard access seeded")
  } else {
    console.log("Admin dashboard access already exists")
  }

  return dashboardAccess
}
