import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if we're in dev mode with auth bypass enabled
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"

  console.log("Middleware - Environment variables:", {
    NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE,
    NEXT_PUBLIC_BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
    devMode,
    bypassAuth,
  })

  // Skip middleware for login routes, static files, and API routes
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/public") ||
    request.nextUrl.pathname.startsWith("/health")
  ) {
    return NextResponse.next()
  }

  // Skip auth check in dev mode with bypass enabled
  if (devMode && bypassAuth) {
    console.log("Middleware - Bypassing authentication due to dev mode and bypass auth")
    return NextResponse.next()
  }

  // Check if the user is authenticated
  const accessToken = request.cookies.get("token")?.value
  
  if (!accessToken) {
    // Redirect to login page if not authenticated
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
}
