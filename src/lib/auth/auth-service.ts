import axios from "axios"

// Types for authentication
export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

export interface UserProfile {
  sub: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  email?: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
}

// Local storage keys
const ACCESS_TOKEN_KEY = "token"
const REFRESH_TOKEN_KEY = "refreshToken"

class AuthService {
  private refreshPromise: Promise<TokenResponse> | null = null
  private tokenExpiryTime: number | null = null
  private refreshErrorCount = 0
  private readonly MAX_REFRESH_ERRORS = 3

  // API Base URL - updated for Vite
  private API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

  constructor() {
    console.log("[AuthService] Initializing with API_BASE_URL:", this.API_BASE_URL)

    if (typeof window !== "undefined") {
      this.setupInterceptors()
      console.log("[AuthService] Axios interceptors set up")
    }
  }

  private setupInterceptors() {
    // Add request interceptor to handle token refreshes
    axios.interceptors.request.use(
      async (config) => {
        // Only add token to API requests, not auth endpoints
        if (config.url && !config.url.includes("/auth/")) {
          const token = await this.getValidToken()
          if (token) {
            config.headers["Authorization"] = `Bearer ${token}`
            console.log("[AuthService] Added token to request:", config.url)
          }
        }
        return config
      },
      (error) => {
        console.error("[AuthService] Request interceptor error:", error)
        return Promise.reject(error)
      },
    )

    // Add response interceptor to handle 401 errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Handle token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log("[AuthService] 401 error detected, attempting token refresh")
          originalRequest._retry = true

          try {
            // Force token refresh
            const token = await this.getValidToken(true)
            if (token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`
              console.log("[AuthService] Retrying request with new token")
              return axios(originalRequest)
            }
          } catch (refreshError) {
            // If refresh fails, redirect to login
            console.error("[AuthService] Token refresh failed, redirecting to login:", refreshError)
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            window.location.href = "/login"
          }
        }

        return Promise.reject(error)
      },
    )
  }

  async login(username: string, password: string): Promise<TokenResponse> {
    console.log("[AuthService] Attempting login for user:", username)

    const formData = new URLSearchParams()
    formData.append("username", username)
    formData.append("password", password)
    formData.append("grant_type", "password")

    try {
      console.log("[AuthService] Sending login request to:", `${this.API_BASE_URL}/api/auth/login`)

      const response = await axios.post<TokenResponse>(`${this.API_BASE_URL}/api/auth/login`, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      console.log("[AuthService] Login response received:", response.status)

      if (response.data.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token)
        console.log("[AuthService] Access token stored in localStorage")

        if (response.data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token)
          console.log("[AuthService] Refresh token stored in localStorage")
        }

        this.tokenExpiryTime = Date.now() + (response.data.expires_in - 30) * 1000
        console.log("[AuthService] Token expiry time set:", new Date(this.tokenExpiryTime).toISOString())
      } else {
        console.warn("[AuthService] No access token in response")
      }

      return response.data
    } catch (error) {
      console.error("[AuthService] Login error:", error)
      throw error
    }
  }

  async getUserInfo(token?: string): Promise<UserProfile> {
    const authToken = token || localStorage.getItem(ACCESS_TOKEN_KEY)
    console.log("[AuthService] Getting user info, token exists:", !!authToken)

    if (!authToken) {
      console.error("[AuthService] No authentication token available")
      throw new Error("No authentication token available")
    }

    try {
      console.log("[AuthService] Sending user info request to:", `${this.API_BASE_URL}/api/auth/user`)

      const response = await axios.get<UserProfile>(`${this.API_BASE_URL}/api/auth/user`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      console.log("[AuthService] User info received:", response.status)
      console.log("[AuthService] User data:", response.data)

      return response.data
    } catch (error) {
      console.error("[AuthService] Error getting user info:", error)
      throw error
    }
  }

  async getValidToken(forceRefresh = false): Promise<string | null> {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    
    if (!token || !refreshToken) {
      return null
    }

    // Check if token is expired or about to expire
    const shouldRefresh = forceRefresh || !this.tokenExpiryTime || Date.now() >= this.tokenExpiryTime
    console.log("[AuthService] Should refresh token:", shouldRefresh)

    if (shouldRefresh) {
      try {
        // If there's already a refresh in progress, wait for it
        if (this.refreshPromise) {
          console.log("[AuthService] Refresh already in progress, waiting")
          const result = await this.refreshPromise
          return result.access_token
        }

        // Start a new refresh
        console.log("[AuthService] Starting token refresh")
        this.refreshPromise = this.refreshToken(refreshToken)
        const result = await this.refreshPromise

        if (result.error) {
          // Handle refresh error
          console.error("[AuthService] Token refresh error:", result.error)
          this.refreshErrorCount++
          console.log("[AuthService] Refresh error count:", this.refreshErrorCount)

          if (this.refreshErrorCount >= this.MAX_REFRESH_ERRORS) {
            // Too many errors, clear tokens and redirect to login
            console.error("[AuthService] Too many refresh errors, redirecting to login")
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            window.location.href = "/login"
          }
          return token // Return old token as fallback
        } else {
          // Reset error count on successful refresh
          console.log("[AuthService] Token refresh successful")
          this.refreshErrorCount = 0
          return result.access_token
        }
      } finally {
        this.refreshPromise = null
      }
    }

    return token
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    console.log("[AuthService] Refreshing token")

    const formData = new URLSearchParams()
    formData.append("refresh_token", refreshToken)

    try {
      console.log("[AuthService] Sending refresh request to:", `${this.API_BASE_URL}/api/auth/refresh`)

      const response = await axios.post<TokenResponse>(`${this.API_BASE_URL}/api/auth/refresh`, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      console.log("[AuthService] Refresh response received:", response.status)

      // Update tokens in local storage
      if (response.data.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token)
        console.log("[AuthService] New access token stored")

        if (response.data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token)
          console.log("[AuthService] New refresh token stored")
        }

        // Update expiry time (subtract 30 seconds for safety margin)
        this.tokenExpiryTime = Date.now() + (response.data.expires_in - 30) * 1000
        console.log("[AuthService] New token expiry time set:", new Date(this.tokenExpiryTime).toISOString())
      } else {
        console.warn("[AuthService] No access token in refresh response")
      }

      return response.data
    } catch (error) {
      console.error("[AuthService] Error refreshing token:", error)
      return {
        error: "refresh_failed",
        error_description: "Failed to refresh token",
      } as TokenResponse
    }
  }

  async logout(): Promise<void> {
    console.log("[AuthService] Logging out")
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    this.tokenExpiryTime = null
    console.log("[AuthService] Local storage cleared")
  }

  isAuthenticated(): boolean {
    const isAuth = localStorage.getItem(ACCESS_TOKEN_KEY) !== null
    console.log("[AuthService] isAuthenticated check:", isAuth)
    return isAuth
  }
}

const authService = new AuthService()
export default authService
