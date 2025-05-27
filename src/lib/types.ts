export interface AuthState {
  isAuthenticated: boolean
  token?: string
  refreshToken?: string
  user?: KeycloakUserInfo
  error?: string
}

export interface KeycloakTokenResponse {
  access_token: string
  expires_in: number
  refresh_expires_in: number
  refresh_token: string
  token_type: string
  id_token?: string
  "not-before-policy"?: number
  session_state?: string
  scope?: string
  error?: string
  error_description?: string
}

export interface KeycloakUserInfo {
  sub: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  email?: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  [key: string]: any // For additional claims
}
