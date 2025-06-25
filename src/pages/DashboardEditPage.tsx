
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { getDashboardById, updateDashboard, deleteDashboard } from "@/lib/api/api-client"
import type { Dashboard, DashboardItem, FilterConfig } from "@/lib/types"

export default function DashboardEditPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { authState } = useAuth()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const dashboardId = params?.id as string

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true)
        const data = await getDashboardById(dashboardId)
        setDashboard(data)
      } catch (error) {
        console.error("Error fetching dashboard:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (dashboardId) {
      fetchDashboard()
    }
  }, [dashboardId, toast])

  const handleSave = async () => {
    if (!dashboard) return

    try {
      setIsSaving(true)
      await updateDashboard(dashboardId, dashboard)
      toast({
        title: "Success",
        description: "Dashboard saved successfully",
      })
    } catch (error) {
      console.error("Error saving dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to save dashboard",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this dashboard?")) return

    try {
      await deleteDashboard(dashboardId)
      toast({
        title: "Success",
        description: "Dashboard deleted successfully",
      })
      navigate("/analytics-hub")
    } catch (error) {
      console.error("Error deleting dashboard:", error)
      toast({
        title: "Error",
        description: "Failed to delete dashboard",
        variant: "destructive",
      })
    }
  }

  const handleBack = () => {
    navigate("/analytics-hub")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto py-4 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard not found</h1>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analytics Hub
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Edit Dashboard</h1>
          <p className="text-muted-foreground">{dashboard.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="mt-8 p-8 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Dashboard Editor</h3>
        <p className="text-muted-foreground">
          Dashboard editing interface will be implemented here.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Dashboard ID: {dashboardId}
        </p>
      </div>
    </div>
  )
}
