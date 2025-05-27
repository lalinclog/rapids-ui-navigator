"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-context"
import DashboardApp from "@/components/dashboard-app"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut } from "lucide-react"

export default function DashboardPage() {
  const { authState, logout, isLoading } = useAuth()
  const router = useRouter()

  // Add explicit console logs for debugging
  console.log("Dashboard page rendered", {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    user: authState.user,
  })

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isLoading && !authState.isAuthenticated) {
      console.log("User is not authenticated, redirecting to login")
      router.push("/login")
    }
  }, [authState.isAuthenticated, isLoading, router])

  const handleLogout = async () => {
    await logout()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (!authState.isAuthenticated) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col h-screen">
      {/* User welcome and logout bar */}
      <div className="bg-background/90 backdrop-blur-sm border-b px-4 py-2 flex justify-between items-center">
        <div className="text-sm">
          Welcome, <span className="font-medium">{authState.user?.preferred_username || "User"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Main dashboard app */}
      <div className="flex-1 overflow-hidden">
        <DashboardApp />
      </div>
    </div>
  )
}
