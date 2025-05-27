import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import type { Dashboard } from "@/lib/types"

// Define ADMIN_USER_ID directly here to avoid circular dependencies
const ADMIN_USER_ID = "2af311d8-df7a-4881-ac38-4232d4f5959b"

// In-memory storage for dashboards
import { mockDashboards as initialDashboards } from "@/lib/mock/mock-data"
const dashboards = [...initialDashboards]

// GET handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("page_size") || "10")
  const status = searchParams.get("status")
  const classification = searchParams.get("classification")
  const search = searchParams.get("search")
  const tags = searchParams.getAll("tags")
  const favorite = searchParams.get("favorite") === "true"
  const createdByMe = searchParams.get("created_by_me") === "true"
  const accessible = searchParams.get("accessible") === "true"

  let filteredDashboards = [...dashboards]

  // Apply filters
  if (status && status !== "all") {
    filteredDashboards = filteredDashboards.filter((d) => d.status === status)
  }

  if (classification && classification !== "all") {
    filteredDashboards = filteredDashboards.filter((d) => d.classification === classification)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filteredDashboards = filteredDashboards.filter(
      (d) =>
        d.name.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower) ||
        d.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
    )
  }

  if (tags.length > 0) {
    filteredDashboards = filteredDashboards.filter((d) => tags.some((tag) => d.tags.includes(tag)))
  }

  if (favorite) {
    filteredDashboards = filteredDashboards.filter((d) => d.is_favorited_by)
  }

  if (createdByMe) {
    // In mock mode, assume current user is admin
    filteredDashboards = filteredDashboards.filter((d) => d.created_by === ADMIN_USER_ID)
  }

  if (accessible) {
    filteredDashboards = filteredDashboards.filter((d) => d.hasAccess)
  }

  // Paginate
  const total = filteredDashboards.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDashboards = filteredDashboards.slice(startIndex, endIndex)

  return NextResponse.json({
    dashboards: paginatedDashboards,
    total,
    page,
    pageSize,
  })
}

// POST handler
export async function POST(request: Request) {
  const body = await request.json()

  // Validate required fields
  if (!body.name) {
    return NextResponse.json({ success: false, message: "Dashboard name is required" }, { status: 400 })
  }

  // Create new dashboard
  const newDashboard: Dashboard = {
    id: uuidv4(),
    name: body.name,
    description: body.description || "",
    status: body.status || "draft",
    classification: body.classification || "internal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: ADMIN_USER_ID, // In dev mode, assume current user is admin
    updated_by: ADMIN_USER_ID,
    tags: body.tags || [],
    is_public: body.is_public || false,
    is_favorited_by: false,
    hasAccess: true,
    thumbnail: body.thumbnail || "/placeholder.svg?height=200&width=300",
    data: body.data || {},
  }

  // Add new dashboard to in-memory storage
  dashboards.push(newDashboard)

  return NextResponse.json({
    success: true,
    data: newDashboard,
  })
}
