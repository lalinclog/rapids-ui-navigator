import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Hub</h1>
      </div>

      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-xl">Loading Analytics Hub...</span>
      </div>
    </div>
  )
}
