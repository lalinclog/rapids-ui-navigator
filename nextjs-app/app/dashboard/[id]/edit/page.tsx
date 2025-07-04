// app/dashboard/[id]/edit/.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-context"
import { getDashboardById, updateDashboard, deleteDashboard } from "@/lib/api/api-client"
import type { Dashboard, DashboardItem } from "@/lib/types"
import type { FilterType } from "@/components/types/filter"
import DashboardApp from "@/components/dashboard-app"
import isEqual from "lodash.isequal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DashboardData {
  items: DashboardItem[]
  globalFilters: FilterType[]
  dimensions: { width: number; height: number }
}

export default function DashboardEditPage() {
  console.log("[DashboardEditPage] Component rendering")
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { authState, isLoading: authLoading } = useAuth()

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    items: [],
    globalFilters: [],
    dimensions: { width: 1200, height: 800 },
  })

  // Check if user is admin
  const isAdmin = authState.user?.realm_access?.roles?.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  console.log("[DashboardEditPage] isAdmin:", isAdmin)

  const offlineMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"
  console.log("[DashboardEditPage] offlineMode:", offlineMode)

  // Get dashboard ID from params
  const dashboardId = params?.id as string
  console.log("[DashboardEditPage] dashboardId from params:", dashboardId)


  // Auth redirect effect
  useEffect(() => {
    console.log("[DashboardEditPage] Auth effect running")
    if (!authState.isAuthenticated && !offlineMode) {
      console.log("[DashboardEditPage] Not authenticated, redirecting to login")
      router.replace("/login")
    }
  }, [authState.isAuthenticated, offlineMode, router])

  // Fetch dashboard data
  useEffect(() => {
    console.log("[DashboardEditPage] Fetch effect running")
    const fetchDashboard = async () => {
      if (!dashboardId || (!authState.isAuthenticated && !offlineMode)) {
        console.log("[DashboardEditPage] Missing required conditions for fetch")
        return
      }

      console.log("[DashboardEditPage] Starting dashboard fetch")
      setIsLoading(true)
      try {
        const data = await getDashboardById(dashboardId)
        console.log("[DashboardEditPage] API response data:", data)

        // Convert globalFilters from Record to FilterType[] if needed
        let globalFilters: FilterType[] = []
        if (data.data?.globalFilters) {
          globalFilters = Array.isArray(data.data.globalFilters)
            ? data.data.globalFilters
            : Object.entries(data.data.globalFilters).map(([key, value]) => ({
              id: key,
              name: key,
              type: "text",
              field: key,
              operator: "equals",
              value,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
        }

        // Ensure items is always an array and properly typed
        const items: DashboardItem[] = Array.isArray(data.data?.items)
          ? data.data.items.map((item: any) => ({
            id: item.id || uuidv4(),
            type: item.type || "chart",
            x: typeof item.x === "number" ? item.x : 0,
            y: typeof item.y === "number" ? item.y : 0,
            width: typeof item.width === "number" ? item.width : 300,
            height: typeof item.height === "number" ? item.height : 200,
            content: item.content || [],
            config: item.config || {},
            title: item.title || "",
            pageId: item.pageId || "main",
            zIndex: typeof item.zIndex === "number" ? item.zIndex : 1,
            chart_id: item.chart_id || null,
          }))
          : []

        const initialData: DashboardData = {
          items,
          globalFilters,
          //globalFilters: data.data?.globalFilters || {},
          dimensions: data.data?.dimensions || { width: 1200, height: 800 },
        }

        console.log("[DashboardEditPage] Initial dashboard data:", initialData)

        setDashboard(data)
        setDashboardData(initialData)
      } catch (error) {
        console.error("[DashboardEditPage] Error fetching dashboard:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard. Please try again.",
          variant: "destructive",
        })
      } finally {
        console.log("[DashboardEditPage] Fetch completed")
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [dashboardId, toast, authState.isAuthenticated, offlineMode])

  // Handle dashboard data change
  const handleDashboardChange = useCallback(
    (newData: DashboardData) => {
      if (!isEqual(newData, dashboardData)) {
        setDashboardData(newData)
      }
    },
    [dashboardData],
  )
  
  // Handle save
  const handleSave = async () => {
    console.log("[DashboardEditPage] Save initiated")
    if (!dashboard) {
      console.log("[DashboardEditPage] No dashboard to save")
      return
    }

    setIsSaving(true)
    console.log("[DashboardEditPage] Saving dashboard with data:", dashboardData)

    try {
      //const items = dashboardData?.items?.map((item: any) => ({
      const items = dashboardData.items.map((item: DashboardItem) => ({
        id: item.id,
        type: item.type,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        config: item.config,
        content: item.content,
        title: item.title,
        pageId: item.pageId,
        zIndex: item.zIndex,
        chart_id: item.chart_id,
      }))

      // Convert FilterType[] back to Record<string, any> for API
      const globalFiltersRecord = dashboardData.globalFilters.reduce(
        (acc, filter) => {
          acc[filter.field || filter.id] = filter.value
          return acc
        },
        {} as Record<string, any>,
      )

      const payload = {
        name: dashboard.name,
        description: dashboard.description,
        //global_filters: dashboardData?.globalFilters || {},
        global_filters: globalFiltersRecord,
        layout: {
          dimensions: dashboardData.dimensions,
        },
        data: {
          items,
          //globalFilters: dashboardData?.globalFilters || {},
          global_filters: globalFiltersRecord,
          dimensions: dashboardData.dimensions,
        },
      }

      console.log("[DashboardEditPage] Saving payload:", payload)
      await updateDashboard(dashboardId, payload)
      toast({ title: "Dashboard Saved", description: "Your changes have been saved successfully." })
    } catch (error) {
      console.error("[DashboardEditPage] Error saving dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to save dashboard. Please try again.",
        variant: "destructive",
      })
    } finally {
      console.log("[DashboardEditPage] Save completed")
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    console.log("[DashboardEditPage] Delete initiated")
    setIsDeleting(true)
    try {
      console.log("[DashboardEditPage] Deleting dashboard:", dashboardId)
      await deleteDashboard(dashboardId)

      toast({
        title: "Dashboard Deleted",
        description: "The dashboard has been deleted successfully.",
      })

      router.push("/analytics-hub")
    } catch (error) {
      console.error("[DashboardEditPage] Error deleting dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to delete dashboard. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  // Handle back button click
  const handleBack = () => {
    console.log("[DashboardEditPage] Navigating back to view mode")
    router.push(`/dashboard/${dashboardId}/view`)
  }

  // If not authenticated and not in offline mode, don't render anything
  if (!authState.isAuthenticated && !offlineMode) {
    console.log("[DashboardEditPage] Not authenticated, not rendering")
    return null
  }

  // Loading state
  if (authLoading || isLoading) {
    console.log("[DashboardEditPage] Loading state")
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  // Check if dev mode is enabled with auth bypass
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"

  // If not admin, show unauthorized message
  if (!isAdmin) {
    console.log("[DashboardEditPage] User not admin")
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="mb-4">You do not have permission to edit this dashboard.</p>
        <Button onClick={handleBack}>View Dashboard</Button>
      </div>
    )
  }

  // If dashboard not found, show message
  if (!dashboard) {
    console.log("[DashboardEditPage] Dashboard not found")
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Dashboard Not Found</h1>
        <p className="mb-4">The requested dashboard could not be found.</p>
        <Button onClick={() => router.push("/analytics-hub")}>Back to Analytics Hub</Button>
      </div>
    )
  }

  console.log("[DashboardEditPage] Rendering main component with data:", {
    dashboard,
    dashboardData,
    isLoading,
    isSaving,
  })

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit: {dashboard.name}</h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">{dashboard.description}</p>

      {dashboard && dashboardData && dashboardData.items && (
        <DashboardApp
          //key={`dashboard-${dashboardId}-${dashboardData.items.length}`} // Force re-render when items change
          dashboard={dashboard}
          readOnly={false}
          onChange={handleDashboardChange}
          items={dashboardData.items}
          globalFilters={dashboardData.globalFilters}
          //globalFilters={dashboardData.globalFilters || {}}
          dashboardWidth={dashboardData.dimensions.width}
          dashboardHeight={dashboardData.dimensions.height}
          initialData={dashboardData}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the dashboard and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
