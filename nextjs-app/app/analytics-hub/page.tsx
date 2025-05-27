// app/analytics-hub/page.tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Search,
  Star,
  StarOff,
  Plus,
  Calendar,
  User,
  Tag,
  Lock,
  Edit,
  Eye,
  BarChart,
  Home,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-context"
import { getDashboards, toggleFavorite, createAccessRequest, cancelAccessRequest } from "@/lib/api/api-client"
import type { Dashboard } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AnalyticsHub() {
  const router = useRouter()
  const { toast } = useToast()
  const { authState, isLoading: authLoading } = useAuth()
  const { user, isAuthenticated } = authState

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [classificationFilter, setClassificationFilter] = useState("")
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null)
  const [accessReason, setAccessReason] = useState("")
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)

  // Get user roles
  const userRoles = user?.realm_access?.roles || []
  const isAdmin = userRoles.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const isDev = userRoles.includes("dev")
  const isDataSteward = userRoles.includes("data_steward")
  const isEngineer = userRoles.includes("engineer")
  const isAnalyst = userRoles.includes("analyst")

  // Check if user can create dashboards
  const canCreateDashboard = isAdmin || isDev || process.env.NEXT_PUBLIC_DEV_MODE === "true"

  console.log("canCreateDashboard User Role", canCreateDashboard)

  // Fetch dashboards based on active tab and filters
  useEffect(() => {
    const fetchDashboards = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const filters: any = {
          search: searchQuery,
        }

        if (statusFilter && statusFilter !== "all") {
          filters.status = statusFilter
        }

        if (classificationFilter && classificationFilter !== "all") {
          filters.classification = classificationFilter
        }

        // Apply tab-specific filters
        if (activeTab === "favorites") {
          filters.favorite = true
        } else if (activeTab === "my-dashboards") {
          filters.myDashboards = true
        } else if (activeTab === "accessible") {
          filters.accessible = true
        }

        const response = await getDashboards(1, 50, filters)
        //console.log("getDashboards API Response:", response)

        // Log expected structure for comparison
        //console.log("🟨 Expected Dashboard Structure Example:", Dashboard)

        // Check if response has the expected structure
        if (Array.isArray(response)) {
          setDashboards(response as Dashboard[])
        } else if (response && response.dashboards) {
          setDashboards(response.dashboards)
        } else {
          console.error("Unexpected API response format:", response)
          setDashboards([])
          setError("Received an unexpected response format from the server")
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error)
        setDashboards([])
        setError(`Failed to load dashboards: ${error instanceof Error ? error.message : String(error)}`)
        toast({
          title: "Error",
          description: "Failed to load dashboards. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboards()
  }, [activeTab, searchQuery, statusFilter, classificationFilter, toast])

  // Handle dashboard click
  const handleDashboardClick = (dashboard: Dashboard) => {
    console.log("Clicked dashboard:", dashboard.name)
    console.log("Dashboard access flags:", {
      hasAccess: dashboard.hasAccess,
      isAdmin,
      isDataSteward,
      isEngineer
    })
  
    if (dashboard.hasAccess || isAdmin || isDataSteward || isEngineer) {
      console.log("Access granted. Redirecting to dashboard...")
      router.push(`/dashboard/${dashboard.id}/view`)
    } else {
      console.warn("Access denied for current user to this dashboard:", {
        dashboardId: dashboard.id,
        userRoles,
        dashboardPermissions: dashboard.hasAccess || null,
        ownerId: dashboard.owner_id
      })
      setSelectedDashboard(dashboard)
    }
  }
  

  // Handle favorite toggle
  const handleToggleFavorite = async (e: React.MouseEvent, dashboard: Dashboard) => {
    e.stopPropagation()
    try {
      await toggleFavorite(dashboard.id, !dashboard.is_favorited_by)
      setDashboards(dashboards.map((d) => (d.id === dashboard.id ? { ...d, is_favorited_by: !d.is_favorited_by } : d)))
      toast({
        title: dashboard.is_favorited_by ? "Removed from favorites" : "Added to favorites",
        description: `${dashboard.name} has been ${dashboard.is_favorited_by ? "removed from" : "added to"} your favorites.`,
      })
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle access request
  const handleRequestAccess = async () => {
    if (!selectedDashboard) return

    setIsRequestingAccess(true)
    try {
      await createAccessRequest({
        dataset_id: selectedDashboard.id,
        reason: accessReason,
      })

      toast({
        title: "Access Requested",
        description: `Your request to access ${selectedDashboard.name} has been submitted.`,
      })

      setSelectedDashboard(null)
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

  const handleCancelAccessRequest = async (dashboard: Dashboard) => {
    try {
      await cancelAccessRequest(dashboard.id)
      toast({
        title: "Request Cancelled",
        description: `Your access request for "${dashboard.name}" has been cancelled.`,
      })
      // Refresh dashboards
      setDashboards(dashboards.map(d => d.id === dashboard.id ? { ...d, has_pending_request: false } : d))
    } catch (error) {
      console.error("Failed to cancel access request:", error)
      toast({
        title: "Error",
        description: "Could not cancel the access request. Please try again.",
        variant: "destructive",
      })
    }
  }
  

  // Handle direct access request from card
  const handleCardRequestAccess = (e: React.MouseEvent, dashboard: Dashboard) => {
    e.stopPropagation()
    setSelectedDashboard(dashboard)
  }

  // Handle create new dashboard
  const handleCreateDashboard = () => {
    router.push("/dashboard/create")
  }

  // Navigate to home
  const navigateToHome = () => {
    router.push("/")
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading authentication...</span>
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
        <p className="mb-4">Please log in to access the Analytics Hub.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={navigateToHome} className="h-10 w-10">
            <Home className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Analytics Hub</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/documentation")}>
            Documentation
          </Button>
          {canCreateDashboard && (
            <Button onClick={handleCreateDashboard}>
              <Plus className="mr-2 h-4 w-4" /> Create Dashboard
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_dev">In Development</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="prod">Production</SelectItem>
              <SelectItem value="decommissioned">Decommissioned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classificationFilter} onValueChange={setClassificationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Dashboards</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="my-dashboards">My Dashboards</TabsTrigger>
          <TabsTrigger value="accessible">Accessible</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <DashboardGrid
            dashboards={dashboards || []}
            isLoading={isLoading}
            onDashboardClick={handleDashboardClick}
            onToggleFavorite={handleToggleFavorite}
            onRequestAccess={handleCardRequestAccess}
            onCancelAccessRequest={handleCancelAccessRequest} 
            isAdmin={isAdmin}
            isAnalyst={isAnalyst}
            isDev={isDev}
            isDataSteward={isDataSteward}
            isEngineer={isEngineer}
          />
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          <DashboardGrid
            dashboards={dashboards || []}
            isLoading={isLoading}
            onDashboardClick={handleDashboardClick}
            onToggleFavorite={handleToggleFavorite}
            onRequestAccess={handleCardRequestAccess}
            onCancelAccessRequest={handleCancelAccessRequest} 
            isAdmin={isAdmin}
            isAnalyst={isAnalyst}
            isDev={isDev}
            isDataSteward={isDataSteward}
            isEngineer={isEngineer}
          />
        </TabsContent>

        <TabsContent value="my-dashboards" className="mt-0">
          <DashboardGrid
            dashboards={dashboards || []}
            isLoading={isLoading}
            onDashboardClick={handleDashboardClick}
            onToggleFavorite={handleToggleFavorite}
            onRequestAccess={handleCardRequestAccess}
            onCancelAccessRequest={handleCancelAccessRequest} 
            isAdmin={isAdmin}
            isAnalyst={isAnalyst}
            isDev={isDev}
            isDataSteward={isDataSteward}
            isEngineer={isEngineer}
          />
        </TabsContent>

        <TabsContent value="accessible" className="mt-0">
          <DashboardGrid
            dashboards={dashboards || []}
            isLoading={isLoading}
            onDashboardClick={handleDashboardClick}
            onToggleFavorite={handleToggleFavorite}
            onRequestAccess={handleCardRequestAccess}
            onCancelAccessRequest={handleCancelAccessRequest} 
            isAdmin={isAdmin}
            isAnalyst={isAnalyst}
            isDev={isDev}
            isDataSteward={isDataSteward}
            isEngineer={isEngineer}
          />
        </TabsContent>
      </Tabs>

      {/* Access Request Dialog */}
      <Dialog open={!!selectedDashboard} onOpenChange={(open) => !open && setSelectedDashboard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Access</DialogTitle>
            <DialogDescription>
              You don't have access to "{selectedDashboard?.name}". Please provide a reason for your request.
            </DialogDescription>
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
            <Button variant="outline" onClick={() => setSelectedDashboard(null)}>
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

interface DashboardGridProps {
  dashboards: Dashboard[]
  isLoading: boolean
  onDashboardClick: (dashboard: Dashboard) => void
  onToggleFavorite: (e: React.MouseEvent, dashboard: Dashboard) => void
  onRequestAccess: (e: React.MouseEvent, dashboard: Dashboard) => void
  onCancelAccessRequest: (dashboard: Dashboard) => void
  isAdmin: boolean
  isAnalyst: boolean
  isDev: boolean
  isDataSteward: boolean
  isEngineer: boolean
}

function DashboardGrid({
  dashboards,
  isLoading,
  onDashboardClick,
  onToggleFavorite,
  onRequestAccess,
  onCancelAccessRequest,
  isAdmin,
  isAnalyst,
  isDev,
  isDataSteward,
  isEngineer,
}: DashboardGridProps) {
  const router = useRouter() 

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboards...</span>
      </div>
    )
  }

  // Ensure dashboards is always an array
  const dashboardsArray = Array.isArray(dashboards) ? dashboards : []

  if (dashboardsArray.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No dashboards found.</p>
      </div>
    )
  }

  // Check if user can view dashboard in edit mode
  const canViewEditMode = isAdmin || isDev || isAnalyst || isDataSteward || isEngineer

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboardsArray.map((dashboard) => (
        <Card
          key={dashboard.id}
          className={`cursor-pointer transition-shadow hover:shadow-md ${!dashboard.hasAccess && !isAdmin && !isDataSteward && !isEngineer ? "opacity-80" : ""}`}
          onClick={() => onDashboardClick(dashboard)}
        >
          <div className="relative h-40 bg-muted">
            {dashboard.thumbnail ? (
              <img
                src={dashboard.thumbnail || "/dashboard.svg"}
                alt={dashboard.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <BarChart className="h-12 w-12 text-muted-foreground opacity-30" />
              </div>
            )}

            <div className="absolute top-2 right-2 flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1 bg-background rounded-full shadow-sm"
                      onClick={(e) => onToggleFavorite(e, dashboard)}
                    >
                      {dashboard.is_favorited_by ? (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{dashboard.is_favorited_by ? "Remove from favorites" : "Addh to favorites"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Edit mode button for analysts and admins */}
              {(dashboard.hasAccess || isAdmin) && 
                (dashboard.status !== 'decommissioned') &&
                canViewEditMode && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="p-1 bg-background rounded-full shadow-sm hover:bg-accent transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dashboard.status === 'decommissioned') {
                              toast({
                                title: "Cannot edit",
                                description: "Decommissioned dashboards cannot be edited",
                                variant: "destructive"
                              });
                              return;
                            }
                            router.push(`/dashboard/${dashboard.id}/edit`)
                          }}
                          disabled={dashboard.status === 'decommissioned'}
                        >
                          <Edit className={`h-5 w-5 ${
                            dashboard.status === 'decommissioned' 
                              ? 'text-muted-foreground/50' 
                              : 'text-muted-foreground'
                          }`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {dashboard.status === 'decommissioned' 
                          ? "Decommissioned - cannot edit" 
                          : "Edit Dashboard"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              )}

              {/* View mode button */}
              {dashboard.hasAccess && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1 bg-background rounded-full shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/${dashboard.id}/view`)
                        }}
                      >
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>View Dashboard</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{dashboard.name}</CardTitle>
            </div>
            <CardDescription className="line-clamp-2">{dashboard.description}</CardDescription>
          </CardHeader>

          <CardContent className="pb-2">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center text-muted-foreground">
                <User className="h-3.5 w-3.5 mr-1" />
                <span>Created by: {dashboard.created_by}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Updated: {formatDate(dashboard.updated_at)}</span>
              </div>
              {dashboard.tags && dashboard.tags.length > 0 && (
                <div className="flex items-center text-muted-foreground mt-1 flex-wrap gap-1">
                  <Tag className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  {dashboard.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-0 flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusVariant(dashboard.status)}>{formatStatus(dashboard.status)}</Badge>
              <Badge variant={getClassificationVariant(dashboard.classification)}>
                {formatClassification(dashboard.classification)}
              </Badge>
            </div>

            {!dashboard.hasAccess && !isAdmin && !isDataSteward && !isEngineer && (
              dashboard.has_pending_request ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelAccessRequest(dashboard)
                  }}
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Cancel Request
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={(e) => onRequestAccess(e, dashboard)}>
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Request Access
                </Button>
              )
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

// Helper functions for formatting and styling
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "Draft",
    in_dev: "In Development",
    qa: "QA",
    prod: "Production",
    decommissioned: "Decommissioned",
  }
  return statusMap[status] || status
}

function formatClassification(classification: string): string {
  const classMap: Record<string, string> = {
    public: "Public",
    internal: "Internal",
    confidential: "Confidential",
    restricted: "Restricted",
  }
  return classMap[classification] || classification
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "outline",
    in_dev: "secondary",
    qa: "default",
    prod: "default",
    decommissioned: "destructive",
  }
  return variantMap[status] || "outline"
}

function getClassificationVariant(classification: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    public: "outline",
    internal: "secondary",
    confidential: "default",
    restricted: "destructive",
  }
  return variantMap[classification] || "outline"
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A"

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Use 24-hour format; set to true for AM/PM
    }).format(date)
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Invalid date"
  }
}
