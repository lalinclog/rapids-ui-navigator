"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { login, authState, isLoading, devMode, bypassAuth, keycloakAvailable } = useAuth()
  const router = useRouter()

  // Log the current state for debugging
  console.log("Login page rendered", {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    devMode,
    bypassAuth,
    keycloakAvailable,
  })

  // If already authenticated, redirect to home
  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (authState.isAuthenticated) {
      console.log("Already authenticated, redirecting to home")
      router.push("/")
    }
  }, [authState.isAuthenticated, router])

  // If in dev mode with bypass auth or offline mode, auto-login
  useEffect(() => {
    if (devMode && bypassAuth && !authState.isAuthenticated && !isLoading) {
        console.log("Dev mode with bypass auth or offline mode, auto-logging in")
        login("admin_user", "password").then((success) => {
          if (success) {
          router.push("/")
        }
        })
    }
  }, [devMode, bypassAuth, authState.isAuthenticated, isLoading, login, router])

  const handleLogin = async () => {
    try {
      setError(null)

      // Validate inputs
      if (!username || !password) {
        setError("Username and password are required")
        return
      }

      const success = await login(username, password)
      if (success) {
        router.push("/")
      } else {
        setError(authState.error || "Login failed. Please check your credentials and try again.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  // If auto-login is in progress, show loading
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

          {!keycloakAvailable && !devMode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Authentication service is currently unavailable. Please try again later or contact your administrator.
              </AlertDescription>
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
                disabled={isLoading || (devMode && bypassAuth)}
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
                disabled={isLoading || (devMode && bypassAuth)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin()
                  }
                }}
              />
            </div>

            <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground pb-4">
              {keycloakAvailable
                ? "Secure authentication powered by Keycloak"
                : "Authentication service status: Unavailable"}
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={handleLogin}
              disabled={isLoading || (!keycloakAvailable && !devMode)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in with Keycloak"
              )}
            </Button>
          </div>

          {devMode && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Development Mode</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Auth bypass: {bypassAuth ? "Enabled" : "Disabled"}
              </p>
              {bypassAuth && (
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Auto-login will be attempted with admin credentials.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
