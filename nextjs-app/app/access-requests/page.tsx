"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-context"
import { getAccessRequests, updateAccessRequest } from "@/lib/api/api-client"
import type { AccessRequest } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AccessRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { authState, isLoading: authLoading } = useAuth()
  const { user, isAuthenticated } = authState

  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user roles
  const userRoles = user?.realm_access?.roles || []
  const isAdmin = userRoles.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const isDataSteward = userRoles.includes("data_steward")
  const isEngineer = userRoles.includes("engineer")

  // Check if user can review access requests
  const canReviewAccess = isAdmin || isDataSteward || isEngineer || process.env.NEXT_PUBLIC_DEV_MODE === "true"

  // Fetch access requests
  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const filters: any = {}

        if (statusFilter && statusFilter !== "all") {
          filters.status = statusFilter
        }

        // Apply tab-specific filters
        if (activeTab === "my-requests") {
          filters.myRequests = true
        } else if (activeTab === "pending-review" && canReviewAccess) {
          filters.status = "pending"
        }

        const response = await getAccessRequests(1, 50, filters)

        // Filter by search query if provided
        let filteredRequests = response.requests
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filteredRequests = filteredRequests.filter(
            (req) =>
              req.dashboard?.name.toLowerCase().includes(query) ||
              req.user?.username.toLowerCase().includes(query) ||
              req.user?.email.toLowerCase().includes(query) ||
              req.reason.toLowerCase().includes(query),
          )
        }

        setRequests(filteredRequests)
      } catch (error) {
        console.error("Error fetching access requests:", error)
        setError("Failed to load access requests. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load access requests. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (
      isAuthenticated ||
      (process.env.NEXT_PUBLIC_DEV_MODE === "true" && process.env.NEXT_PUBLIC_BYPASS_AUTH === "true")
    ) {
      fetchRequests()
    }
  }, [activeTab, statusFilter, searchQuery, toast, isAuthenticated, canReviewAccess])

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      const updatedRequest = await updateAccessRequest(selectedRequest.id, {
        status: "approved",
        reviewNotes,
      })

      // Update local state
      setRequests(requests.map((req) => (req.id === selectedRequest.id ? updatedRequest : req)))

      toast({
        title: "Request Approved",
        description: `Access request for ${selectedRequest.dashboard?.name} has been approved.`,
      })

      setSelectedRequest(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error",
        description: "Failed to approve access request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      const updatedRequest = await updateAccessRequest(selectedRequest.id, {
        status: "rejected",
        reviewNotes,
      })

      // Update local state
      setRequests(requests.map((req) => (req.id === selectedRequest.id ? updatedRequest : req)))

      toast({
        title: "Request Rejected",
        description: `Access request for ${selectedRequest.dashboard?.name} has been rejected.`,
      })

      setSelectedRequest(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject access request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
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
        <p className="mb-4">Please log in to access the Access Requests page.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Access Requests</h1>
        <Button onClick={() => router.push("/analytics-hub")}>Back to Analytics Hub</Button>
      </div>

      <Tabs defaultValue={canReviewAccess ? "all" : "my-requests"} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {canReviewAccess && <TabsTrigger value="pending-review">Pending Review</TabsTrigger>}
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all" className="mt-0">
          <RequestsList
            requests={requests}
            isLoading={isLoading}
            error={error}
            canReviewAccess={canReviewAccess}
            onReviewRequest={setSelectedRequest}
            router={router}
          />
        </TabsContent>

        <TabsContent value="my-requests" className="mt-0">
          <RequestsList
            requests={requests}
            isLoading={isLoading}
            error={error}
            canReviewAccess={canReviewAccess}
            onReviewRequest={setSelectedRequest}
            router={router}
          />
        </TabsContent>

        {canReviewAccess && (
          <TabsContent value="pending-review" className="mt-0">
            <RequestsList
              requests={requests}
              isLoading={isLoading}
              error={error}
              canReviewAccess={canReviewAccess}
              onReviewRequest={setSelectedRequest}
              router={router}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Access Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.user?.username} has requested access to {selectedRequest?.dashboard?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Request Reason:</h4>
              <p className="text-sm text-muted-foreground">{selectedRequest?.reason}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Review Notes (optional):</h4>
              <Textarea
                placeholder="Add notes about your decision..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            {canReviewAccess && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={handleRejectRequest}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject
                </Button>
                <Button
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={handleApproveRequest}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RequestsListProps {
  requests: AccessRequest[]
  isLoading: boolean
  error: string | null
  canReviewAccess: boolean
  onReviewRequest: (request: AccessRequest) => void
  router: any
}

function RequestsList({ requests, isLoading, error, canReviewAccess, onReviewRequest, router }: RequestsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading access requests...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-center text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No access requests found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{request.dashboard?.name || "Unknown Dashboard"}</CardTitle>
                <CardDescription>
                  Requested by {request.user?.username || "Unknown User"} ({request.user?.email || "No email"})
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(request.status)}>{formatStatus(request.status)}</Badge>
            </div>
          </CardHeader>

          <CardContent className="pb-2">
            <div className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">Request Reason:</h4>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
              </div>

              {request.reviewNotes && (
                <div>
                  <h4 className="text-sm font-medium">Review Notes:</h4>
                  <p className="text-sm text-muted-foreground">{request.reviewNotes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Requested: {formatDate(request.requestedAt)}
                </Badge>

                {request.reviewedAt && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Reviewed: {formatDate(request.reviewedAt)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            {request.status === "pending" ? (
              <div className="flex gap-2">
                {canReviewAccess ? (
                  <>
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => onReviewRequest(request)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => onReviewRequest(request)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Waiting for review
                  </div>
                )}
              </div>
            ) : (
              <Button variant="outline" onClick={() => router.push(`/dashboard/${request.dashboardId}/view`)}>
                View Dashboard
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

// Helper functions
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  }
  return statusMap[status] || status
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }
  return variantMap[status] || "outline"
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
