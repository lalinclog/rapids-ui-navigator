"use client"

import type React from "react"
import type { DashboardStatus, DashboardClassification } from "@/lib/types"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-context"
import { createDashboard } from "@/lib/api/api-client"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export default function CreateDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { authState, isLoading: authLoading } = useAuth()
  const { user, isAuthenticated } = authState

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<DashboardStatus>("in_dev")
  const [classification, setClassification] = useState<DashboardClassification>("internal")
  const [is_public, setIsPublic] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.realm_access?.roles?.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"

  // Handle create dashboard
  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Dashboard name is required")
      toast({
        title: "Error",
        description: "Dashboard name is required.",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      // Prepare dashboard data according to the API expectations
      const dashboardData = {
        name,
        description,
        status,
        classification,
        is_public: is_public,
        tags,
        created_by: user?.preferred_username || "anonymous",
        // Add any other fields required by your API
        layout: {}, // Empty layout to start with
        global_filters: {}, // Empty filters to start with
        owner_id: user?.sub || null,
        access_roles: [],
      }

      console.log("Submitting dashboard data:", dashboardData)
      const dashboard = await createDashboard(dashboardData)

      toast({
        title: "Dashboard Created",
        description: "Your new dashboard has been created successfully.",
      })

      router.push(`/dashboard/${dashboard.id}/edit`)
    } catch (error) {
      console.error("Error creating dashboard:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
      toast({
        title: "Error",
        description: `Failed to create dashboard: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Handle back button click
  const handleBack = () => {
    router.push("/analytics-hub")
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

  console.log("CreateDashboard Check:", { isAuthenticated, devMode, bypassAuth })

  // If not authenticated and not in dev mode with bypass, show message
  if (!isAuthenticated && !(devMode && bypassAuth)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-4">Please log in to create a dashboard.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    )
  }

  // If not admin, show unauthorized message
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="mb-4">You do not have permission to create dashboards.</p>
        <Button onClick={() => router.push("/analytics-hub")}>Go to Analytics Hub</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Create New Dashboard</h1>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleCreateDashboard}>
          <CardHeader>
            <CardTitle>Dashboard Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Dashboard Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter dashboard name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter dashboard description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select value={status} onValueChange={(value) => setStatus(value as DashboardStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_dev">In Development</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="classification" className="text-sm font-medium">
                  Classification
                </label>
                <Select 
                  value={classification} 
                  onValueChange={(value) => setClassification(value as DashboardClassification)}
                >
                  <SelectTrigger id="classification">
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag and press Enter"
              />
              <p className="text-xs text-muted-foreground mt-1">Press Enter to add a tag</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={is_public}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_public" className="text-sm font-medium">
                Make dashboard public
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
