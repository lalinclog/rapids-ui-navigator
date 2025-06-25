
import { useAuth } from "@/contexts/AuthContext"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState, isLoading, devMode, bypassAuth } = useAuth()
  const location = useLocation()

  console.log("[ProtectedRoute] Checking protection for:", location.pathname, {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    devMode,
    bypassAuth,
  })

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    )
  }

  // Allow access in dev mode with bypass
  if (devMode && bypassAuth) {
    console.log("[ProtectedRoute] Allowing access due to dev mode bypass")
    return <>{children}</>
  }

  // Redirect to login if not authenticated
  if (!authState.isAuthenticated) {
    console.log("[ProtectedRoute] Redirecting to login")
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
