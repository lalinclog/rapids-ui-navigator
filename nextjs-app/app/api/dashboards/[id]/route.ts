import { NextResponse } from "next/server"

// Define ADMIN_USER_ID directly here to avoid circular dependencies
const ADMIN_USER_ID = "2af311d8-df7a-4881-ac38-4232d4f5959b"

// In-memory storage for dashboards
import { mockDashboards as initialDashboards } from "@/lib/mock/mock-data"
const dashboards = [...initialDashboards]

// GET handler
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  const dashboard = dashboards.find((d) => d.id === id)

  if (!dashboard) {
    return NextResponse.json({ success: false, message: "Dashboard not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: dashboard,
  })
}

// PUT handler
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await request.json()

  const index = dashboards.findIndex((d) => d.id === id)

  if (index === -1) {
    return NextResponse.json({ success: false, message: "Dashboard not found" }, { status: 404 })
  }

  // Update dashboard
  const updatedDashboard = {
    ...dashboards[index],
    ...body,
    updated_at: new Date().toISOString(),
    updated_by: ADMIN_USER_ID, // In dev mode, assume current user is admin
  }

  dashboards[index] = updatedDashboard

  return NextResponse.json({
    success: true,
    data: updatedDashboard,
  })
}

// DELETE handler
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  const index = dashboards.findIndex((d) => d.id === id)

  if (index === -1) {
    return NextResponse.json({ success: false, message: "Dashboard not found" }, { status: 404 })
  }

  // Remove dashboard
  dashboards.splice(index, 1)

  return NextResponse.json({
    success: true,
    message: "Dashboard deleted successfully",
  })
}
