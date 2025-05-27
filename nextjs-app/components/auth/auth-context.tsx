"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { jwtDecode } from "jwt-decode"
import keycloakService, { type AuthState } from "@/lib/auth/keycloak"

// More explicit check for development mode and bypass auth
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true"
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"

// Add console log to verify the environment variables are being read
console.log("AUTH CONTEXT - Environment variables:", {
  NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE,
  NEXT_PUBLIC_BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
  NEXT_PUBLIC_KEYCLOAK_URL: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
  NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  DEV_MODE,
  BYPASS_AUTH,
})

interface AuthContextType {
  authState: AuthState
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  devMode: boolean // Add devMode to the context
  bypassAuth: boolean // Add bypassAuth to the context
  keycloakAvailable: boolean
}

// Create a mock user for development mode
const DEV_USER = {
  sub: "dev-user",
  preferred_username: "Developer",
  email: "dev@example.com",
  realm_access: { roles: ["admin", "developer"] },
  resource_access: {},
}

// Create initial auth state based on dev mode and bypass auth
const initialAuthState: AuthState =
  DEV_MODE && BYPASS_AUTH
    ? {
        isAuthenticated: true,
        token: "dev-mode-token",
        refreshToken: "dev-mode-refresh-token",
        user: DEV_USER,
      }
    : { isAuthenticated: false }

const AuthContext = createContext<AuthContextType>({
  authState: initialAuthState,
  login: async () => false,
  logout: async () => {},
  isLoading: !(DEV_MODE && BYPASS_AUTH), // Not loading if in dev mode with bypass
  devMode: DEV_MODE,
  bypassAuth: BYPASS_AUTH,
  keycloakAvailable: false,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState)
  const [isLoading, setIsLoading] = useState(!(DEV_MODE && BYPASS_AUTH))
  const [keycloakAvailable, setKeycloakAvailable] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if Keycloak is available
  useEffect(() => {
    const checkKeycloakAvailability = async () => {
      try {
        const available = await keycloakService.isAvailable()
        console.log("Keycloak availability check:", available)
        setKeycloakAvailable(available)
      } catch (error) {
        console.error("Error checking Keycloak availability:", error)
        setKeycloakAvailable(false)
      }
    }

    // Skip check if in dev mode with bypass auth
    if (DEV_MODE && BYPASS_AUTH) {
      setKeycloakAvailable(true)
      return
    }

    // Check immediately and then every 30 seconds
    checkKeycloakAvailability()
    const interval = setInterval(checkKeycloakAvailability, 300000)

    return () => clearInterval(interval)
  }, [])

  // Add explicit console logs for debugging
  console.log("AuthProvider rendered", {
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    pathname,
    devMode: DEV_MODE,
    bypassAuth: BYPASS_AUTH,
    keycloakAvailable,
  })

  useEffect(() => {
    // If in dev mode with bypass auth, we've already set up the mock authentication in the initial state
    if (DEV_MODE && BYPASS_AUTH) {
      console.log("Development mode with auth bypass active - skipping authentication")

      setIsLoading(false)
      return
    }

    // Normal authentication flow for production
    const checkAuth = async () => {
      setIsLoading(true)
      console.log("Checking authentication state")
      const token = localStorage.getItem("token")
      if (token) {
        try {
          console.log("Token found in localStorage, validating")
          // Decode the token to extract roles and other info
          const decodedToken: any = jwtDecode(token)

          // Check if token is expired
          const currentTime = Math.floor(Date.now() / 1000)
          if (decodedToken.exp && decodedToken.exp < currentTime) {
            console.log("Token is expired, clearing auth state")
            localStorage.removeItem("token")
            localStorage.removeItem("refreshToken")
            setAuthState({ isAuthenticated: false })
            setIsLoading(false)
            return
          }

          // If Keycloak is not available, use the decoded token info
          if (!keycloakAvailable) {
            console.log("Keycloak not available, using decoded token info")
            setAuthState({
              isAuthenticated: true,
              token,
              refreshToken: localStorage.getItem("refreshToken"),
              user: {
                sub: decodedToken.sub,
                preferred_username: decodedToken.preferred_username || "User",
                email: decodedToken.email,
                realm_access: decodedToken.realm_access || { roles: [] },
                resource_access: decodedToken.resource_access || {},
              },
            })
            setIsLoading(false)
            return
          }

          // Fetch user info from Keycloak
          try {
            const user = await keycloakService.getUserInfo(token)
            console.log("User info fetched successfully", user)

            // Merge the decoded token data with user info
            const enhancedUser = {
              ...user,
              // Include realm_access with roles from the token
              realm_access: decodedToken.realm_access || { roles: [] },
              // Include resource_access with client-specific roles from the token
              resource_access: decodedToken.resource_access || {},
              // Add any other JWT claims we want to expose
              exp: decodedToken.exp,
              iat: decodedToken.iat,
              auth_time: decodedToken.auth_time,
              jti: decodedToken.jti,
              iss: decodedToken.iss,
              sub: decodedToken.sub,
            }

            console.log("Setting authenticated state with user", enhancedUser)
            setAuthState({
              isAuthenticated: true,
              token,
              refreshToken: localStorage.getItem("refreshToken"),
              user: enhancedUser,
            })
          } catch (error) {
            console.error("Error fetching user info:", error)
            // If we can't fetch user info but have a valid token, still set authenticated
            setAuthState({
              isAuthenticated: true,
              token,
              refreshToken: localStorage.getItem("refreshToken"),
              user: {
                sub: decodedToken.sub,
                preferred_username: decodedToken.preferred_username || "User",
                email: decodedToken.email,
                realm_access: decodedToken.realm_access || { roles: [] },
                resource_access: decodedToken.resource_access || {},
              },
            })
          }
        } catch (error) {
          // Token is invalid, clear localStorage
          console.error("Error validating token:", error)
          localStorage.removeItem("token")
          localStorage.removeItem("refreshToken")
          setAuthState({ isAuthenticated: false })
        }
      } else {
        console.log("No token found in localStorage")
        setAuthState({ isAuthenticated: false })
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [keycloakAvailable])

  useEffect(() => {
    if (DEV_MODE && BYPASS_AUTH) return

    keycloakService.setupInterceptors(
      // Get token function
      () => localStorage.getItem("token"),
      // Get refresh token function
      () => localStorage.getItem("refreshToken"),
      // Handle refresh success
      (tokenData) => {
        console.log("Token refreshed successfully")
        localStorage.setItem("token", tokenData.access_token)
        if (tokenData.refresh_token) {
          localStorage.setItem("refreshToken", tokenData.refresh_token)
        }
      },
      // Handle refresh failure
      () => {
        console.error("Token refresh failed, clearing auth state")
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        setAuthState({ isAuthenticated: false })

        // Only redirect if not already on login page
        if (pathname !== "/login") {
          console.log("Redirecting to login after token refresh failure")
          router.push("/login")
        }
      },
    )
  }, [router, pathname])

  const login = async (username: string, password: string): Promise<boolean> => {
    // In dev mode with bypass auth or offline mode, always return successful login
    if (DEV_MODE && BYPASS_AUTH) {
      console.log("Development mode with auth bypass or offline mode - simulating successful login")
      setAuthState({
        isAuthenticated: true,
        token: "dev-mode-token",
        refreshToken: "dev-mode-refresh-token",
        user: {
          ...DEV_USER,
          preferred_username: username || "Developer",
          email: `${username || "admin_user"}@example.com`,
        },
      })
      return true
    }

    // If Keycloak is not available, show error
    if (!keycloakAvailable && !DEV_MODE) {
      console.error("Keycloak is not available")
      setAuthState({
        isAuthenticated: false,
        error: "Authentication service is not available. Please try again later.",
      })
      return false
    }

    try {
      console.log("Login attempt started for user:", username)
      setIsLoading(true)
      const tokenData = await keycloakService.login(username, password)

      if (!tokenData.access_token) {
        console.error("Login failed: No access token received")
        setAuthState({
          isAuthenticated: false,
          error: "Login failed. No access token received.",
        })
        return false
      }

      console.log("Login successful, storing tokens")
      // Store tokens in localStorage
      localStorage.setItem("token", tokenData.access_token)
      if (tokenData.refresh_token) {
        localStorage.setItem("refreshToken", tokenData.refresh_token)
      }

      // Decode the token to extract roles and other info
      const decodedToken: any = jwtDecode(tokenData.access_token)

      // Get user info
      let user
      try {
      console.log("Fetching user info")
      user = await keycloakService.getUserInfo(tokenData.access_token)
      } catch (error) {
        console.error("Error fetching user info:", error)
        // If we can't fetch user info but have a valid token, still set authenticated
        user = {
          sub: decodedToken.sub,
          preferred_username: decodedToken.preferred_username || username,
          email: decodedToken.email,
          realm_access: decodedToken.realm_access || { roles: [] },
          resource_access: decodedToken.resource_access || {},
        }
      }

      // Merge the decoded token data with user info
      const enhancedUser = {
        ...user,
        // Include realm_access with roles from the token
        realm_access: decodedToken.realm_access || { roles: [] },
        // Include resource_access with client-specific roles from the token
        resource_access: decodedToken.resource_access || {},
        // Add any other JWT claims we want to expose
        exp: decodedToken.exp,
        iat: decodedToken.iat,
        auth_time: decodedToken.auth_time,
        jti: decodedToken.jti,
        iss: decodedToken.iss,
        sub: decodedToken.sub,
      }

      console.log("Setting authenticated state with user data")
      setAuthState({
        isAuthenticated: true,
        token: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        user: enhancedUser,
      })

      // Set a cookie for middleware authentication checks
      document.cookie = `token=${tokenData.access_token}; path=/; max-age=${tokenData.expires_in}`

      return true
    } catch (error) {
      console.error("Login error:", error)
      setAuthState({
        isAuthenticated: false,
        error: "Login failed. Please check your credentials and try again.",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    // In dev mode with bypass auth or offline mode, just reset the auth state
    if (DEV_MODE && BYPASS_AUTH) {
      console.log("Development mode with auth bypass or offline mode - simulating logout")
      setAuthState({
        isAuthenticated: true, // Keep authenticated in dev mode
        token: "dev-mode-token",
        refreshToken: "dev-mode-refresh-token",
        user: DEV_USER,
      })
      router.push("/login")
      return
    }

    try {
      console.log("Logout started")
      const refreshToken = localStorage.getItem("refreshToken")

      // Only try to call logout API if Keycloak is available
      if (keycloakAvailable && refreshToken) {
        try {
          await keycloakService.logout(refreshToken)
        } catch (error) {
          console.error("Error calling logout API:", error)
          // Continue with local logout even if API call fails
        }
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      console.log("Clearing auth state and redirecting to login")
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      // Clear the auth cookie
      document.cookie = "token=; path=/; max-age=0"
      setAuthState({ isAuthenticated: false })
      router.push("/login")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        login,
        logout,
        isLoading,
        devMode: DEV_MODE, // Expose dev mode in the context
        bypassAuth: BYPASS_AUTH, // Expose bypass auth in the context
        keycloakAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
