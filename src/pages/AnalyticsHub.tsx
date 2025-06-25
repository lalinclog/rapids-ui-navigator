
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"

export default function AnalyticsHub() {
  const navigate = useNavigate()

  const handleCreateDashboard = () => {
    // For now, navigate to a sample dashboard
    navigate("/dashboard/sample-id/edit")
  }

  const handleViewDashboard = () => {
    navigate("/dashboard/sample-id/view")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Hub</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your analytics dashboards
          </p>
        </div>
        <Button onClick={handleCreateDashboard}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Sample Dashboard</h3>
          <p className="text-muted-foreground mb-4">
            A sample dashboard with charts and visualizations
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleViewDashboard}>
              View
            </Button>
            <Button size="sm" onClick={handleCreateDashboard}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
