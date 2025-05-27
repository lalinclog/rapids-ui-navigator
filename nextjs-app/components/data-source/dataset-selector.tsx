// data-source/dataset-selector
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, FileSpreadsheet, Table, Upload, BarChart, PieChart, LineChart } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Sample datasets for demonstration
const sampleDatasets = [
  {
    id: "sales-data",
    name: "Sales Data",
    description: "Monthly sales data by product category",
    preview: [
      { name: "Jan", electronics: 4000, clothing: 2400, food: 1800 },
      { name: "Feb", electronics: 3000, clothing: 1398, food: 2800 },
      { name: "Mar", electronics: 2000, clothing: 9800, food: 2200 },
      { name: "Apr", electronics: 2780, clothing: 3908, food: 2000 },
      { name: "May", electronics: 1890, clothing: 4800, food: 2181 },
    ],
    icon: <BarChart className="h-8 w-8 text-blue-500" />,
  },
  {
    id: "user-demographics",
    name: "User Demographics",
    description: "User age distribution by region",
    preview: [
      { name: "Under 18", north: 400, south: 240, east: 180, west: 320 },
      { name: "18-24", north: 300, south: 139, east: 280, west: 250 },
      { name: "25-34", north: 200, south: 980, east: 220, west: 210 },
      { name: "35-44", north: 278, south: 390, east: 200, west: 300 },
      { name: "45-54", north: 189, south: 480, east: 218, west: 170 },
      { name: "55+", north: 289, south: 380, east: 250, west: 190 },
    ],
    icon: <PieChart className="h-8 w-8 text-green-500" />,
  },
  {
    id: "website-traffic",
    name: "Website Traffic",
    description: "Daily website traffic and conversion rates",
    preview: [
      { name: "Mon", visitors: 5000, pageViews: 15000, conversions: 120 },
      { name: "Tue", visitors: 5500, pageViews: 17000, conversions: 150 },
      { name: "Wed", visitors: 6200, pageViews: 19500, conversions: 170 },
      { name: "Thu", visitors: 6800, pageViews: 21000, conversions: 200 },
      { name: "Fri", visitors: 7500, pageViews: 23000, conversions: 220 },
    ],
    icon: <LineChart className="h-8 w-8 text-purple-500" />,
  },
  {
    id: "product-performance",
    name: "Product Performance",
    description: "Performance metrics for top products",
    preview: [
      { name: "Product A", sales: 4200, returns: 200, satisfaction: 4.5 },
      { name: "Product B", sales: 3800, returns: 180, satisfaction: 4.2 },
      { name: "Product C", sales: 5100, returns: 250, satisfaction: 4.7 },
      { name: "Product D", sales: 2900, returns: 120, satisfaction: 3.9 },
      { name: "Product E", sales: 3500, returns: 150, satisfaction: 4.1 },
    ],
    icon: <Table className="h-8 w-8 text-orange-500" />,
  },
  {
    id: "radar-data",
    name: "Radar Chart Data",
    description: "Multi-dimensional data for radar charts",
    preview: [
      { category: "Product A", sales: 90, marketing: 80, development: 70, support: 60, research: 75 },
      { category: "Product B", sales: 65, marketing: 75, development: 85, support: 70, research: 60 },
      { category: "Product C", sales: 80, marketing: 60, development: 55, support: 90, research: 85 },
      { category: "Product D", sales: 75, marketing: 85, development: 80, support: 75, research: 70 },
    ],
    icon: <Database className="h-8 w-8 text-indigo-500" />,
  },
  {
    id: "radial-data",
    name: "Radial Bar Data",
    description: "Age demographic data for radial bar charts",
    preview: [
      { name: "18-24", value: 240 },
      { name: "25-34", value: 380 },
      { name: "35-44", value: 320 },
      { name: "45-54", value: 280 },
      { name: "55-64", value: 220 },
      { name: "65+", value: 160 },
    ],
    icon: <PieChart className="h-8 w-8 text-red-500" />,
  },
]

interface DatasetSelectorProps {
  onDataSelect: (data: any[]) => void
  currentData?: any[]
  buttonVariant?: "default" | "outline" | "secondary"
  buttonText?: string
}

export default function DatasetSelector({
  onDataSelect,
  currentData,
  buttonVariant = "outline",
  buttonText = "Select Dataset",
}: DatasetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("sample")
  const [csvData, setCsvData] = useState("")
  const [jsonData, setJsonData] = useState("")
  const { toast } = useToast()
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    if (open && activeTab === "sample") {
      fetchDatasets()
    }
  }, [open, activeTab])

  const fetchDatasets = async () => {
    if (devMode) {
      setDatasets(sampleDatasets)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/bi/datasets')
      if (!response.ok) {
        throw new Error('Failed to fetch datasets')
      }
      const data = await response.json()
      
      // Transform API data to match our sample data structure
      const transformedDatasets = data.map((dataset: any) => ({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        preview: dataset.sampleData || [], // Use sampleData from API or empty array
        icon: getIconForDataset(dataset.type || 'table')
      }))
      
      setDatasets(transformedDatasets)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets')
      setLoading(false)
      toast({
        title: "Error loading datasets",
        description: "Could not fetch datasets from the server",
        variant: "destructive",
      })
    }
  }

  const getIconForDataset = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bar':
        return <BarChart className="h-8 w-8 text-blue-500" />
      case 'pie':
        return <PieChart className="h-8 w-8 text-green-500" />
      case 'line':
        return <LineChart className="h-8 w-8 text-purple-500" />
      case 'table':
        return <Table className="h-8 w-8 text-orange-500" />
      case 'radar':
        return <Database className="h-8 w-8 text-indigo-500" />
      default:
        return <Database className="h-8 w-8 text-gray-500" />
    }
  }

  const handleSampleDataSelect = (dataset: any) => {
    onDataSelect(dataset.preview)
    setOpen(false)
    toast({
      title: "Dataset loaded",
      description: `Loaded ${dataset.name} dataset with ${dataset.preview.length} rows`,
    })
  }

  const handleCSVImport = () => {
    try {
      // Simple CSV parsing
      const lines = csvData.trim().split("\n")
      const headers = lines[0].split(",").map((h) => h.trim())

      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim())
        const row: Record<string, any> = {}

        headers.forEach((header, index) => {
          // Try to convert to number if possible
          const value = values[index]
          const numValue = Number(value)
          row[header] = isNaN(numValue) ? value : numValue
        })

        return row
      })

      onDataSelect(data)
      setOpen(false)
      setCsvData("")

      toast({
        title: "CSV data imported",
        description: `Imported ${data.length} rows of data`,
      })
    } catch (error) {
      toast({
        title: "Error importing CSV",
        description: "Please check your CSV format and try again",
        variant: "destructive",
      })
    }
  }

  const handleJSONImport = () => {
    try {
      const data = JSON.parse(jsonData)

      if (!Array.isArray(data)) {
        throw new Error("JSON data must be an array")
      }

      onDataSelect(data)
      setOpen(false)
      setJsonData("")

      toast({
        title: "JSON data imported",
        description: `Imported ${data.length} rows of data`,
      })
    } catch (error) {
      toast({
        title: "Error importing JSON",
        description: "Please check your JSON format and try again",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button variant={buttonVariant} onClick={() => setOpen(true)}>
        <Database className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a Dataset</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sample">Datasets</TabsTrigger>
                <TabsTrigger value="csv">Import CSV</TabsTrigger>
                <TabsTrigger value="json">Import JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="sample" className="space-y-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <p>Loading datasets...</p>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-40 text-red-500">
                      <p>{error}</p>
                    </div>
                  ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datasets.map((dataset) => (
                    <Card key={dataset.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          {dataset.icon}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSampleDataSelect(dataset)}
                            className="h-8 px-2"
                          >
                            Use
                          </Button>
                        </div>
                        <CardTitle className="text-base">{dataset.name}</CardTitle>
                        <CardDescription>{dataset.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground pb-2">
                      {dataset.preview.length} rows, {Object.keys(dataset.preview[0] || {}).length} columns
                      </CardContent>
                    </Card>
                  ))}
                </div>
               )}
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-data">Paste CSV Data</Label>
                    <p className="text-sm text-muted-foreground">
                      First row should contain column headers. Values should be comma-separated.
                    </p>
                    <textarea
                      id="csv-data"
                      className="w-full h-[200px] p-2 border rounded-md font-mono text-sm"
                      placeholder="name,value,category
Product A,42,Electronics
Product B,28,Clothing
Product C,35,Food"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCSVImport} disabled={!csvData.trim()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Import CSV Data
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="json-data">Paste JSON Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Data should be an array of objects with consistent properties.
                    </p>
                    <textarea
                      id="json-data"
                      className="w-full h-[200px] p-2 border rounded-md font-mono text-sm"
                      placeholder='[
  {"name": "Product A", "value": 42, "category": "Electronics"},
  {"name": "Product B", "value": 28, "category": "Clothing"},
  {"name": "Product C", "value": 35, "category": "Food"}
]'
                      value={jsonData}
                      onChange={(e) => setJsonData(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleJSONImport} disabled={!jsonData.trim()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import JSON Data
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}