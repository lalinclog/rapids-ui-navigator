import axios from "axios"

export interface KeycloakTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

export interface KeycloakUserInfo {
  sub: string
  email_verified?: boolean
  name?: string
  preferred_username: string
  given_name?: string
  family_name?: string
  email?: string
  realm_access?: {
    roles: string[]
  }
  resource_access?: Record<string, { roles: string[] }>
}

export interface AuthState {
  isAuthenticated: boolean
  token?: string
  refreshToken?: string
  user?: KeycloakUserInfo
  error?: string
}

// Circuit breaker pattern
const circuitBreaker = {
  status: false,
  lastFailure: 0,
  failureCount: 0,
  resetTimeout: 30000, // 30 seconds
  maxFailures: 3,
}
// Rate limiting
const rateLimit = {
  windowMs: 60000, // 1 minute
  maxCalls: 30,
  callHistory: [] as number[],
}

// Refresh token cooldown
const refreshCooldown = {
  lastRefreshTime: 0,
  cooldownMs: 2000, // 2 seconds
}

class KeycloakService {
  private baseUrl: string
  private realm: string
  private clientId: string
  private clientSecret: string

  constructor() {
    // Match the environment variables from the Python implementation
    this.baseUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://keycloak:8081"
    this.realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "rapids-realm"
    this.clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "rapids-api"
    this.clientSecret = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET || "rapids-api-secret"

    console.log("KeycloakService initialized with:", {
      baseUrl: this.baseUrl,
      realm: this.realm,
      clientId: this.clientId,
    })
  }

    // Check if Keycloak is available
    async isAvailable(): Promise<boolean> {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
  
        const response = await fetch(`${this.baseUrl}/realms/${this.realm}`, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "manual"
        }).catch(() => null)
  
        clearTimeout(timeoutId)

        console.log("Keycloak response status:", response?.status)
        return !!response && (response.status === 200 || response.status === 401);

      } catch (error) {
        console.error("Error checking Keycloak availability:", error)
        return false
      }
    }

      // Check circuit breaker
  private checkCircuit(): boolean {
    if (circuitBreaker.status) {
      const now = Date.now()
      if (now - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
        // Reset circuit breaker after timeout
        console.log("Circuit breaker reset after timeout")
        circuitBreaker.status = false
        circuitBreaker.failureCount = 0
        return true
      } else {
        // Circuit is open, don't attempt request
        console.log("Circuit breaker open, not attempting request")
        throw new Error("Authentication service unavailable (circuit breaker open)")
      }
    }
    return true
  }

    // Check rate limit
    private checkRateLimit(): Promise<void> {
      const now = Date.now()
  
      // Remove calls outside the current window
      rateLimit.callHistory = rateLimit.callHistory.filter((time) => now - time < rateLimit.windowMs)
  
      // Check if we're at the limit
      if (rateLimit.callHistory.length >= rateLimit.maxCalls) {
        console.warn(`Rate limit exceeded: ${rateLimit.callHistory.length} calls in the last ${rateLimit.windowMs}ms`)
  
        // Calculate wait time until we can make another call
        const oldestCall = rateLimit.callHistory[0]
        const waitTime = oldestCall + rateLimit.windowMs - now
  
        if (waitTime > 0) {
          console.log(`Rate limiting: waiting for ${waitTime}ms`)
          return new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }
  
      // Record this call
      rateLimit.callHistory.push(now)
      return Promise.resolve()
    }

      // Request with retry logic
  private async requestWithRetry<T>(method: "get" | "post", url: string, options: any = {}): Promise<T> {
    // Check circuit breaker
    this.checkCircuit()

    // Check rate limit
    await this.checkRateLimit()

    const maxRetries = 3
    const backoffFactor = 1.5

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios[method](url, options)

        // Successful response, reset failure counter
        circuitBreaker.failureCount = 0
        return response.data
      } catch (error: any) {
        // Increment failure counter
        circuitBreaker.failureCount++

        // Check if we need to open the circuit
        if (circuitBreaker.failureCount >= circuitBreaker.maxFailures) {
          circuitBreaker.status = true
          circuitBreaker.lastFailure = Date.now()
          console.error(`Circuit breaker opened after ${circuitBreaker.failureCount} failures`)
        }

        // Last attempt, propagate the error
        if (attempt === maxRetries - 1) {
          console.error(`Request failed after ${maxRetries} attempts:`, error)
          throw error
        }

        // Calculate backoff time with jitter
        const backoff = backoffFactor ** attempt + 0.1 * Math.random()
        console.warn(`Request attempt ${attempt + 1} failed, retrying in ${backoff.toFixed(2)}s:`, error.message)
        await new Promise((resolve) => setTimeout(resolve, backoff * 1000))
      }
    }

    throw new Error("Request failed after retries")
  }

  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    console.log("KeycloakService.login called for user:", username)
    // Create proper form data object for Keycloak
    const formData = new URLSearchParams()
    formData.append("username", username)
    formData.append("password", password)
    formData.append("grant_type", "password")

    try {
      console.log("Sending login request to /api/auth/login")
      const response = await axios.post<KeycloakTokenResponse>("/api/auth/login", formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      console.log("Login response received:", {
        status: response.status,
        hasToken: !!response.data.access_token,
      })
      return response.data
    } catch (error: any) {
      console.error("Login request failed:", error.response?.status, error.message)
      throw error
    }
  }

  async getUserInfo(token: string): Promise<KeycloakUserInfo> {
    try {
      console.log("Fetching user info from /api/auth/user")
      const response = await axios.get<KeycloakUserInfo>("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log("User info response received:", { status: response.status })
      return response.data
    } catch (error: any) {
      console.error("Failed to fetch user info:", error.response?.status, error.message)
      throw error
    }
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    // Check circuit breaker
    if (circuitBreaker.status) {
      const now = Date.now()
      if (now - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
        // Reset circuit breaker after timeout
        console.log("Circuit breaker reset after timeout")
        circuitBreaker.status = false
        circuitBreaker.failureCount = 0
      } else {
        // Circuit is open, don't attempt refresh
        console.log("Circuit breaker open, not attempting token refresh")
        throw new Error("Authentication service unavailable")
      }
    }

    try {
      console.log("Attempting to refresh token")
      const formData = new URLSearchParams()
      formData.append("refresh_token", refreshToken)
      formData.append("grant_type", "refresh_token")

      const response = await axios.post<KeycloakTokenResponse>("/api/auth/refresh", formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      // Reset failure count on success
      circuitBreaker.failureCount = 0
      console.log("Token refresh successful")

      return response.data
    } catch (error: any) {
      // Increment failure counter
      circuitBreaker.failureCount++
      console.error("Token refresh failed:", error.response?.status, error.message)

      // If we've reached max failures, open the circuit
      if (circuitBreaker.failureCount >= circuitBreaker.maxFailures) {
        circuitBreaker.status = true
        circuitBreaker.lastFailure = Date.now()
        console.log("Circuit breaker opened after multiple failures")
      }

      throw error
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    console.log("Logout called, refreshToken present:", !!refreshToken)
    const formData = new URLSearchParams()
    if (refreshToken) {
      formData.append("refresh_token", refreshToken)
    }

    try {
      await axios.post("/api/auth/logout", formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
      console.log("Logout successful")
    } catch (error: any) {
      console.error("Error during logout:", error.response?.status, error.message)
      throw error
    }
  }


  // Create a next.js API route that will handle this
  async createUser(userData: {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
  }): Promise<boolean> {
    try {
      console.log("Creating new user:", userData.username)
      const response = await axios.post("/api/auth/users", userData)
      console.log("User creation response:", response.data)
      return response.data.success === true
    } catch (error: any) {
      console.error("Error creating user:", error.response?.status, error.message)
      return false
    }
  }

  // Setup axios interceptors for auth
  setupInterceptors(
    getToken: () => string | null,
    getRefreshToken: () => string | null,
    handleRefreshSuccess: (response: KeycloakTokenResponse) => void,
    handleRefreshFailure: () => void,
  ) {
    console.log("Setting up axios interceptors")

    // Request interceptor
    axios.interceptors.request.use(
      (config) => {
        // Add token to requests if available
        const token = getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Also check for API keys
        const apiKey = typeof localStorage !== "undefined" ? localStorage.getItem("currentApiKey") : null
        if (apiKey && !token) {
          // Only use API key if JWT token is not available
          config.headers["X-API-Key"] = apiKey
        }

        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor for token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // If error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          console.log("Received 401, attempting token refresh")

          try {
            const refreshToken = getRefreshToken()
            if (!refreshToken) {
              console.error("No refresh token available")
              throw new Error("No refresh token available")
            }

            // Call refresh token endpoint
            const response = await this.refreshToken(refreshToken)

            // Handle successful token refresh
            console.log("Token refresh successful, updating tokens")
            handleRefreshSuccess(response)

            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${response.access_token}`
            return axios(originalRequest)
          } catch (err) {
            // Handle refresh token failure
            console.error("Token refresh failed, handling failure")
            handleRefreshFailure()
            return Promise.reject(err)
          }
        }

        return Promise.reject(error)
      },
    )
  }
}

export const keycloakService = new KeycloakService()
export default keycloakService
