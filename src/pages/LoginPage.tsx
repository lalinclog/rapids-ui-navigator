
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { login, authState, isLoading, devMode, bypassAuth, keycloakAvailable } = useAuth()
  const navigate = useNavigate()

  // If already authenticated, redirect to analytics hub
  useEffect(() => {
    if (authState.isAuthenticated) {
      console.log("Already authenticated, redirecting to analytics hub")
      navigate("/analytics-hub")
    }
  }, [authState.isAuthenticated, navigate])

  // If in dev mode with bypass auth, auto-login
  useEffect(() => {
    if (devMode && bypassAuth && !authState.isAuthenticated && !isLoading) {
      console.log("Dev mode with bypass auth, auto-logging in")
      login("admin_user", "password").then((success) => {
        if (success) {
          navigate("/analytics-hub")
        }
      })
    }
  }, [devMode, bypassAuth, authState.isAuthenticated, isLoading, login, navigate])

  const handleLogin = async () => {
    try {
      setError(null)

      if (!username || !password) {
        setError("Username and password are required")
        return
      }

      const success = await login(username, password)
      if (success) {
        navigate("/analytics-hub")
      } else {
        setError(authState.error || "Login failed. Please check your credentials and try again.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking authentication status...</span>
      </div>
    )
  }

  if (authState.isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Redirecting to dashboard...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
          <CardDescription>Sign in to access your analytics dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin()
                }
              }}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {devMode && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Development Mode</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Auth bypass: {bypassAuth ? "Enabled" : "Disabled"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
