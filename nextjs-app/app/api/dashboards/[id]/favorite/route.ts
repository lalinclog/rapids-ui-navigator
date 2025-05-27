import { NextResponse } from "next/server"

// In-memory storage for dashboards
import { mockDashboards as initialDashboards } from "@/lib/mock/mock-data"
const dashboards = [...initialDashboards]

// POST handler
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await request.json()

  const dashboard = dashboards.find((d) => d.id === id)

  if (!dashboard) {
    return NextResponse.json({ success: false, message: "Dashboard not found" }, { status: 404 })
  }

  // Update favorite status
  dashboard.is_favorited_by = body.favorite === true

  return NextResponse.json({
    success: true,
    data: dashboard,
  })
}
