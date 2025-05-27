"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, FileText, Settings, Users, LogOut } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { authState, offlineMode, logout, keycloakAvailable } = useAuth()

  useEffect(() => {
    // If not authenticated and not in offline mode, redirect to login
    if (!authState.isAuthenticated && !offlineMode) {
      router.push("/login")
    }
  }, [authState.isAuthenticated, offlineMode, router])

  // If not authenticated and not in offline mode, don't render anything
  if (!authState.isAuthenticated && !offlineMode) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    // The logout function already handles the redirect to login page
  }

  const { user, isAuthenticated } = authState

  // Get user roles
  const userRoles = user?.realm_access?.roles || []
  const isAdmin = userRoles.includes("admin") || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const isDev = userRoles.includes("dev")
  const isDataSteward = userRoles.includes("data_steward")
  const isEngineer = userRoles.includes("engineer")

  // Check if user can create dashboards
  const canCreateDashboard = isAdmin || isDev || process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const canManageAccess = isAdmin || isDataSteward || isEngineer || process.env.NEXT_PUBLIC_DEV_MODE === "true"

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Analytics Dashboard Platform</h1>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">
                  Welcome, {user?.preferred_username || "User"}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => router.push("/login")}>
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to the Analytics Dashboard Platform</CardTitle>
              <CardDescription>
                A powerful business intelligence tool for creating, sharing, and analyzing data visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This platform allows you to create interactive dashboards, share insights with your team, and make
                data-driven decisions. With role-based access control, you can ensure that sensitive data is only
                accessible to authorized users.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/documentation")} className="w-full">
                <FileText className="mr-2 h-4 w-4" /> View Documentation
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Navigate to the main sections of the platform</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => router.push("/analytics-hub")}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Analytics Hub</div>
                  <div className="text-sm text-muted-foreground">Browse and access available dashboards</div>
                </div>
              </Button>

              {canCreateDashboard && (
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => router.push("/dashboard/create")}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Create Dashboard</div>
                    <div className="text-sm text-muted-foreground">Design a new analytics dashboard</div>
                  </div>
                </Button>
              )}

              {canManageAccess && (
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => router.push("/access-requests")}
                >
                  <Users className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Access Requests</div>
                    <div className="text-sm text-muted-foreground">Manage dashboard access permissions</div>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => router.push("/documentation")}
              >
                <FileText className="mr-2 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Documentation</div>
                  <div className="text-sm text-muted-foreground">Learn about the platform architecture and usage</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Analytics Dashboard Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
