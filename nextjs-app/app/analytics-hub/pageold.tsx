// app/analytics_hub/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-context"
import { fetchDashboards } from "@/lib/api/api-client"
import type { Dashboard } from "@/lib/api/datasets"

export default function AnalyticsHubPage() {
  const { authState, isLoading } = useAuth()
  const router = useRouter()

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [search, setSearch] = useState("")

  const isAdmin = authState.user?.realm_access?.roles?.includes("admin")
  const isDeveloper = authState.user?.realm_access?.roles?.includes("developer")

  useEffect(() => {
    if (!isLoading && !authState.isAuthenticated) {
      router.push("/login")
    }
  }, [authState.isAuthenticated, isLoading, router])

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchDashboards()
        setDashboards(data)
      } catch (error) {
        console.error("Failed to load dashboards", error)
      }
    }

    if (authState.isAuthenticated) {
      loadData()
    }
  }, [authState.isAuthenticated])

  const filteredDashboards = useMemo(() => {
    return dashboards.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [dashboards, search])

  const favorites = filteredDashboards.filter((d) => d.isFavorited)
  const others = filteredDashboards.filter((d) => !d.isFavorited)

  if (isLoading || !authState.isAuthenticated) return <div>Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Hub</h1>
        {(isAdmin || isDeveloper) && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => router.push("/dashboard/create")}
          >
            + Create Dashboard
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search dashboards..."
        className="mb-6 w-full p-2 border rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {favorites.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-2">Favourites</h2>
          <DashboardGrid dashboards={favorites} router={router} />
        </>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">All Dashboards</h2>
      <DashboardGrid dashboards={others} router={router} />
    </div>
  )
}

function DashboardGrid({
  dashboards,
  router,
}: {
  dashboards: Dashboard[]
  router: any
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dashboards.map((dashboard) => (
        <div
          key={dashboard.id}
          className="border rounded-md p-4 hover:shadow cursor-pointer"
          onClick={() =>
            dashboard.hasAccess
              ? router.push(`/dashboard/${dashboard.id}`)
              : null
          }
        >
          <h2 className="text-lg font-semibold">{dashboard.name}</h2>
          <p className="text-sm text-gray-600">{dashboard.description}</p>
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <p>
              Last Updated:{" "}
              {new Date(dashboard.updated_at).toLocaleString()}
            </p>
            <p>Status: {dashboard.status}</p>
            <p>Owner: {dashboard.owner_id}</p>
            <p>Classification: {dashboard.classification}</p>
          </div>
          {!dashboard.hasAccess && (
            <button
              className="mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs"
              onClick={(e) => {
                e.stopPropagation()
                alert("Request access functionality coming soon.")
              }}
            >
              Request Access
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
