
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Loader2, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardViewPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { authState } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  const dashboardId = params?.id as string

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleEdit = () => {
    navigate(`/dashboard/${dashboardId}/edit`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard View</h1>
        <Button onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Dashboard
        </Button>
      </div>
      <p className="text-muted-foreground">Dashboard ID: {dashboardId}</p>
      <div className="mt-8 p-8 border rounded-lg text-center">
        <p>Dashboard view content will be implemented here.</p>
      </div>
    </div>
  )
}
