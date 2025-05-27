"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Edit, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-context"
import { getDashboardById, createAccessRequest } from "@/lib/api/api-client"
import type { Dashboard } from "@/lib/types"
import DashboardApp from "@/components/dashboard-app"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export default function DashboardViewPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { authState, isLoading: authLoading } = useAuth()
  const { user, isAuthenticated } = authState

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const [accessReason, setAccessReason] = useState("")
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)

  // Get user roles
  const userRoles = user?.realm_access?.roles || []
  const isAdmin = userRoles.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const isDev = userRoles.includes("dev")
  const isDataSteward = userRoles.includes("data_steward")
  const isEngineer = userRoles.includes("engineer")
  const isAnalyst = userRoles.includes("analyst")

  // Check if user can edit dashboards
  const canEditDashboard = isAdmin || isDev || isDataSteward || isEngineer

  // Check if user can view in edit mode (analysts can view in edit mode but not save)
  const canViewEditMode = canEditDashboard || isAnalyst

  // Get dashboard ID from params
  const dashboardId = params?.id as string

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!dashboardId) return

      setIsLoading(true)
      try {
        const dashboardData = await getDashboardById(dashboardId)
        setDashboard(dashboardData)
      } catch (error) {
        console.error("Error fetching dashboard:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [dashboardId, toast])

  // Handle access request
  const handleRequestAccess = async () => {
    if (!dashboard) return

    setIsRequestingAccess(true)
    try {
      await createAccessRequest({
        dashboardId: dashboard.id,
        reason: accessReason,
      })

      toast({
        title: "Access Requested",
        description: `Your request to access ${dashboard.name} has been submitted.`,
      })

      setShowAccessDialog(false)
      setAccessReason("")
    } catch (error) {
      console.error("Error requesting access:", error)
      toast({
        title: "Error",
        description: "Failed to submit access request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRequestingAccess(false)
    }
  }

  // Handle edit button click
  const handleEditClick = () => {
    router.push(`/dashboard/${dashboardId}/edit`)
  }

  // Loading state
  if (authLoading || isLoading) {
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

  // If not authenticated and not in dev mode with bypass, show message
  if (!isAuthenticated && !(devMode && bypassAuth)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-4">Please log in to view this dashboard.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    )
  }

  // If dashboard not found, show message
  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Dashboard Not Found</h1>
        <p className="mb-4">The dashboard you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push("/analytics-hub")}>Go to Analytics Hub</Button>
      </div>
    )
  }

  // If user doesn't have access and is not admin/data steward/engineer, show access request
  if (!dashboard.hasAccess && !isAdmin && !isDataSteward && !isEngineer) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.push("/analytics-hub")} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">{dashboard.name}</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>You don't have access to view this dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
              <p className="text-center mb-6">
                This dashboard requires special access. You can request access by clicking the button below.
              </p>
              <Button onClick={() => setShowAccessDialog(true)}>Request Access</Button>
            </div>
          </CardContent>
        </Card>

        {/* Access Request Dialog */}
        <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Access</DialogTitle>
              <DialogDescription>Please provide a reason why you need access to "{dashboard.name}".</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Textarea
                placeholder="Why do you need access to this dashboard?"
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAccessDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestAccess} disabled={!accessReason.trim() || isRequestingAccess}>
                {isRequestingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Render dashboard
  return (
    <div className="container-fluid p-0">
      <div className="flex justify-between items-center p-4 bg-background/60 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/analytics-hub")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
        </div>

        {canViewEditMode && (
          <Button onClick={handleEditClick}>
            <Edit className="mr-2 h-4 w-4" />
            {canEditDashboard ? "Edit Dashboard" : "View in Edit Mode"}
          </Button>
        )}
      </div>

      <DashboardApp dashboard={dashboard} readOnly={true} />
    </div>
  )
}
