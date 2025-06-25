
"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import authService from "@/lib/auth/auth-service"
import type { UserProfile } from "@/lib/auth/auth-service"

interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  error: string | null
}

interface AuthContextType {
  authState: AuthState
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  devMode: boolean
  bypassAuth: boolean
  keycloakAvailable: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    error: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [keycloakAvailable, setKeycloakAvailable] = useState(false)

  const devMode = import.meta.env.VITE_DEV_MODE === "true"
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true"

  console.log("[AuthProvider] Environment variables:", {
    devMode,
    bypassAuth,
  })

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("[AuthProvider] Checking auth status")
      setIsLoading(true)

      try {
        if (authService.isAuthenticated()) {
          console.log("[AuthProvider] User appears to be authenticated")
          const token = await authService.getValidToken()
          if (token) {
            const userInfo = await authService.getUserInfo(token)
            setAuthState({
              isAuthenticated: true,
              user: userInfo,
              error: null,
            })
            console.log("[AuthProvider] User authenticated successfully")
          } else {
            throw new Error("No valid token available")
          }
        } else {
          console.log("[AuthProvider] User not authenticated")
          setAuthState({
            isAuthenticated: false,
            user: null,
            error: null,
          })
        }
      } catch (error) {
        console.error("[AuthProvider] Error checking auth status:", error)
        setAuthState({
          isAuthenticated: false,
          user: null,
          error: "Authentication check failed",
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    console.log("[AuthProvider] Login attempt for:", username)
    setIsLoading(true)
    setAuthState(prev => ({ ...prev, error: null }))

    try {
      const response = await authService.login(username, password)
      
      if (response.access_token) {
        const userInfo = await authService.getUserInfo(response.access_token)
        setAuthState({
          isAuthenticated: true,
          user: userInfo,
          error: null,
        })
        console.log("[AuthProvider] Login successful")
        return true
      } else {
        throw new Error(response.error_description || "Login failed")
      }
    } catch (error: any) {
      console.error("[AuthProvider] Login error:", error)
      setAuthState({
        isAuthenticated: false,
        user: null,
        error: error.message || "Login failed",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    console.log("[AuthProvider] Logout initiated")
    setIsLoading(true)

    try {
      await authService.logout()
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error)
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
        error: null,
      })
      setIsLoading(false)
      console.log("[AuthProvider] Logout completed")
    }
  }, [])

  const value: AuthContextType = {
    authState,
    login,
    logout,
    isLoading,
    devMode,
    bypassAuth,
    keycloakAvailable,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
