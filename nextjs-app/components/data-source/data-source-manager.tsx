// data-source/dataset-manager

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, FileJson, RefreshCw, Plus, Trash2, ExternalLink, FileSpreadsheet, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getDatasets, getDatasetData, deleteDataset, type Dataset } from "@/lib/api/datasets"
import { useAuth } from "@/components/auth/auth-context"

// Types for data sources
export interface DataSource {
  id: string
  name: string
  type: "csv" | "json" | "api" | "bi" | "demo"
  description?: string
  lastUpdated: string
  status: "active" | "error" | "pending"
  config: {
    url?: string
    refreshInterval?: number
    headers?: Record<string, string>
    queryParams?: Record<string, string>
    datasetId?: number
    demoCategory?: string
  }
  schema?: {
    fields: {
      name: string
      type: string
      description?: string
    }[]
  }
}

// Demo data sources
const DEMO_DATA_SOURCES: DataSource[] = [
  {
    id: "demo-sales",
    name: "Sales Data (Demo)",
    type: "demo",
    description: "Monthly sales data by product category",
    lastUpdated: new Date().toISOString(),
    status: "active",
    config: {
      demoCategory: "sales",
    },
    schema: {
      fields: [
        { name: "month", type: "string", description: "Month of sale" },
        { name: "category", type: "string", description: "Product category" },
        { name: "revenue", type: "number", description: "Revenue in USD" },
        { name: "units", type: "number", description: "Number of units sold" },
        { name: "profit", type: "number", description: "Profit in USD" },
      ],
    },
  },
  {
    id: "demo-website",
    name: "Website Analytics (Demo)",
    type: "demo",
    description: "Website traffic and engagement metrics",
    lastUpdated: new Date().toISOString(),
    status: "active",
    config: {
      demoCategory: "website",
    },
    schema: {
      fields: [
        { name: "date", type: "string", description: "Date of analytics" },
        { name: "visitors", type: "number", description: "Number of unique visitors" },
        { name: "pageviews", type: "number", description: "Number of page views" },
        { name: "bounceRate", type: "number", description: "Bounce rate percentage" },
        { name: "avgSessionDuration", type: "number", description: "Average session duration in seconds" },
        { name: "source", type: "string", description: "Traffic source" },
      ],
    },
  },
  {
    id: "demo-finance",
    name: "Financial Performance (Demo)",
    type: "demo",
    description: "Quarterly financial performance metrics",
    lastUpdated: new Date().toISOString(),
    status: "active",
    config: {
      demoCategory: "finance",
    },
    schema: {
      fields: [
        { name: "quarter", type: "string", description: "Financial quarter" },
        { name: "revenue", type: "number", description: "Revenue in USD" },
        { name: "expenses", type: "number", description: "Expenses in USD" },
        { name: "profit", type: "number", description: "Profit in USD" },
        { name: "growth", type: "number", description: "Growth percentage" },
      ],
    },
  },
]

// Generate demo data based on the data source
export const generateDemoData = (dataSource: DataSource, limit = 100) => {
  const { config } = dataSource

  if (config.demoCategory === "sales") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const categories = ["Electronics", "Clothing", "Home Goods", "Books", "Food"]

    return Array.from({ length: Math.min(months.length * categories.length, limit) }, (_, i) => {
      const month = months[i % months.length]
      const category = categories[Math.floor(i / months.length) % categories.length]
      const revenue = Math.floor(Math.random() * 50000) + 10000
      const units = Math.floor(Math.random() * 500) + 50
      const profit = Math.floor(revenue * (Math.random() * 0.3 + 0.1))

      return { month, category, revenue, units, profit }
    })
  }

  if (config.demoCategory === "website") {
    // Generate dates for the last 30 days
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split("T")[0]
    })

    const sources = ["Direct", "Organic Search", "Social Media", "Referral", "Email"]

    return Array.from({ length: Math.min(dates.length * sources.length, limit) }, (_, i) => {
      const date = dates[i % dates.length]
      const source = sources[Math.floor(i / dates.length) % sources.length]
      const visitors = Math.floor(Math.random() * 1000) + 100
      const pageviews = visitors * (Math.random() * 3 + 1.5)
      const bounceRate = Math.random() * 60 + 20
      const avgSessionDuration = Math.floor(Math.random() * 180) + 30

      return {
        date,
        source,
        visitors,
        pageviews: Math.floor(pageviews),
        bounceRate: Number.parseFloat(bounceRate.toFixed(2)),
        avgSessionDuration,
      }
    })
  }

  if (config.demoCategory === "finance") {
    const years = [2021, 2022, 2023, 2024]
    const quarters = ["Q1", "Q2", "Q3", "Q4"]

    return Array.from({ length: Math.min(years.length * quarters.length, limit) }, (_, i) => {
      const year = years[Math.floor(i / quarters.length)]
      const quarter = quarters[i % quarters.length]
      const revenue = Math.floor(Math.random() * 1000000) + 500000
      const expenses = Math.floor(revenue * (Math.random() * 0.6 + 0.2))
      const profit = revenue - expenses
      const prevProfit = profit * (Math.random() * 0.4 + 0.8)
      const growth = ((profit - prevProfit) / prevProfit) * 100

      return {
        quarter: `${year} ${quarter}`,
        revenue,
        expenses,
        profit,
        growth: Number.parseFloat(growth.toFixed(2)),
      }
    })
  }

  // Default fallback data
  return Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    value: Math.floor(Math.random() * 100),
  }))
}

interface DataSourceManagerProps {
  onSelectDataSource: (dataSource: DataSource, data: any[]) => void
  onClose: () => void
}

export default function DataSourceManager({ onSelectDataSource, onClose }: DataSourceManagerProps) {
  const { toast } = useToast()
  const { isAuthenticated, token } = useAuth()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [biDatasets, setBiDatasets] = useState<Dataset[]>([])
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDataSource, setNewDataSource] = useState<Partial<DataSource>>({
    name: "",
    type: "json",
    description: "",
    config: {},
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadingDataset, setLoadingDataset] = useState<string | null>(null)

  // Load BI datasets when component mounts
  useEffect(() => {
    async function loadBiDatasets() {
      if (isAuthenticated && token) {
        try {
          setIsLoading(true)
          const datasets = await getDatasets()

          // Convert datasets to data sources format
          const biSources: DataSource[] = datasets.map((dataset) => ({
            id: `bi-${dataset.id}`,
            name: dataset.name,
            type: "bi",
            description: dataset.description || "",
            lastUpdated: dataset.updated_at || new Date().toISOString(),
            status: "active",
            config: {
              datasetId: dataset.id,
            },
            schema: (dataset.schema as any) || {
              fields: [],
            },
          }))

          setBiDatasets(datasets)
          setDataSources([...biSources, ...DEMO_DATA_SOURCES])
        } catch (error) {
          console.error("Error loading BI datasets:", error)
          toast({
            title: "Error loading datasets",
            description: "Could not load datasets from the BI service.",
            variant: "destructive",
          })
          // Fall back to demo data
          setDataSources(DEMO_DATA_SOURCES)
        } finally {
          setIsLoading(false)
        }
      } else {
        // Not authenticated, use demo data
        setDataSources(DEMO_DATA_SOURCES)
        setIsLoading(false)
      }
    }

    loadBiDatasets()
  }, [isAuthenticated, token, toast])

  // Load preview data when a data source is selected
  useEffect(() => {
    async function loadPreviewData() {
      if (!selectedDataSource) {
        setPreviewData([])
        return
      }

      setLoadingDataset(selectedDataSource.id)

      try {
        if (selectedDataSource.type === "demo") {
          const data = generateDemoData(selectedDataSource, 20)
          setPreviewData(data)
        } else if (selectedDataSource.type === "bi" && selectedDataSource.config.datasetId) {
          // Fetch data from BI service
          const datasetId = selectedDataSource.config.datasetId
          const data = await getDatasetData(datasetId)
          setPreviewData(data)
        } else if (selectedDataSource.type === "json" && selectedDataSource.config.url) {
          // In a real implementation, this would fetch from the URL
          toast({
            title: "Loading data...",
            description: "This would fetch real data in a production environment.",
          })

          // Simulate loading data
          setTimeout(() => {
            setPreviewData(generateDemoData(DEMO_DATA_SOURCES[0], 10))
          }, 1000)
        }
      } catch (error) {
        console.error("Error loading preview data:", error)
        toast({
          title: "Error loading data",
          description: "Could not load data preview for the selected dataset.",
          variant: "destructive",
        })
        setPreviewData([])
      } finally {
        setLoadingDataset(null)
      }
    }

    loadPreviewData()
  }, [selectedDataSource, toast])

  const handleAddDataSource = () => {
    if (!newDataSource.name) {
      toast({
        title: "Error",
        description: "Data source name is required",
        variant: "destructive",
      })
      return
    }

    const newSource: DataSource = {
      id: `ds-${Date.now()}`,
      name: newDataSource.name || "Unnamed Data Source",
      type: (newDataSource.type as any) || "json",
      description: newDataSource.description || "",
      lastUpdated: new Date().toISOString(),
      status: "pending",
      config: newDataSource.config || {},
    }

    setDataSources([...dataSources, newSource])
    setShowAddDialog(false)
    setNewDataSource({
      name: "",
      type: "json",
      description: "",
      config: {},
    })

    toast({
      title: "Data source added",
      description: "The data source has been added successfully.",
    })
  }

  const handleDeleteDataSource = async (id: string) => {
    try {
      // If it's a BI dataset, delete it from the backend
      if (id.startsWith("bi-")) {
        const datasetId = Number.parseInt(id.replace("bi-", ""), 10)
        await deleteDataset(datasetId)
      }

      setDataSources(dataSources.filter((ds) => ds.id !== id))
      if (selectedDataSource?.id === id) {
        setSelectedDataSource(null)
      }

      toast({
        title: "Data source deleted",
        description: "The data source has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting data source:", error)
      toast({
        title: "Error deleting data source",
        description: "Could not delete the data source. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRefreshDataSource = async (id: string) => {
    toast({
      title: "Refreshing data",
      description: "The data source is being refreshed.",
    })

    const dataSource = dataSources.find((ds) => ds.id === id)
    if (!dataSource) return

    if (dataSource.type === "bi" && dataSource.config.datasetId) {
      try {
        // Re-fetch the dataset data
        setLoadingDataset(id)
        if (selectedDataSource?.id === id) {
          const data = await getDatasetData(dataSource.config.datasetId)
          setPreviewData(data)
        }

        // Update the lastUpdated timestamp
        setDataSources(dataSources.map((ds) => (ds.id === id ? { ...ds, lastUpdated: new Date().toISOString() } : ds)))

        toast({
          title: "Data refreshed",
          description: "The dataset has been refreshed successfully.",
        })
      } catch (error) {
        console.error("Error refreshing dataset:", error)
        toast({
          title: "Error refreshing data",
          description: "Could not refresh the dataset. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingDataset(null)
      }
    } else {
      // For demo or other data sources, just update the timestamp
      setDataSources(dataSources.map((ds) => (ds.id === id ? { ...ds, lastUpdated: new Date().toISOString() } : ds)))
    }
  }

  const handleUseDataSource = () => {
    if (selectedDataSource) {
      onSelectDataSource(selectedDataSource, previewData)
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Data Source Manager</DialogTitle>
          <DialogDescription>Manage and select data sources for your charts and visualizations</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden gap-4">
          {/* Data Sources List */}
          <div className="w-1/3 border rounded-md overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50 flex justify-between items-center">
              <h3 className="font-medium">Data Sources</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Loading data sources...</span>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {dataSources.map((dataSource) => (
                    <Card
                      key={dataSource.id}
                      className={`cursor-pointer hover:bg-accent/10 transition-colors ${
                        selectedDataSource?.id === dataSource.id ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedDataSource(dataSource)}
                    >
                      <CardHeader className="p-3 pb-1">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-medium">{dataSource.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRefreshDataSource(dataSource.id)
                              }}
                              disabled={loadingDataset === dataSource.id}
                            >
                              {loadingDataset === dataSource.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDataSource(dataSource.id)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          {dataSource.type === "json" && <FileJson className="h-3.5 w-3.5" />}
                          {dataSource.type === "csv" && <FileSpreadsheet className="h-3.5 w-3.5" />}
                          {dataSource.type === "api" && <ExternalLink className="h-3.5 w-3.5" />}
                          {dataSource.type === "bi" && <Database className="h-3.5 w-3.5 text-primary" />}
                          {dataSource.type === "demo" && <Database className="h-3.5 w-3.5" />}
                          <span>{dataSource.type === "bi" ? "BI Dataset" : dataSource.type.toUpperCase()}</span>
                          <Badge
                            variant={
                              dataSource.status === "active"
                                ? "default"
                                : dataSource.status === "error"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-[10px] h-4 px-1"
                          >
                            {dataSource.status}
                          </Badge>
                        </div>
                        {dataSource.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{dataSource.description}</p>
                        )}
                        <p className="text-xs mt-1">Updated: {new Date(dataSource.lastUpdated).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Data Preview */}
          <div className="w-2/3 border rounded-md overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium">Data Preview</h3>
            </div>
            {selectedDataSource ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b">
                  <h4 className="font-medium">{selectedDataSource.name}</h4>
                  {selectedDataSource.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedDataSource.description}</p>
                  )}
                  {selectedDataSource.schema && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium">Schema</h5>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedDataSource.schema.fields.map((field) => (
                          <Badge key={field.name} variant="outline" className="text-xs">
                            {field.name}: {field.type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  {loadingDataset === selectedDataSource.id ? (
                    <div className="p-8 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                      <span>Loading data preview...</span>
                    </div>
                  ) : previewData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(previewData[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((value: any, j) => (
                              <TableCell key={j}>
                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      {selectedDataSource.status === "pending" ? (
                        <p>Loading data...</p>
                      ) : (
                        <p>No data available for preview</p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a data source to preview its data</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUseDataSource} disabled={!selectedDataSource || previewData.length === 0}>
            Use Selected Data Source
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Data Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>Add a new data source to use in your charts and visualizations</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newDataSource.name || ""}
                onChange={(e) => setNewDataSource({ ...newDataSource, name: e.target.value })}
                placeholder="Sales Data"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={(newDataSource.type as string) || "json"}
                onValueChange={(value) => setNewDataSource({ ...newDataSource, type: value as any })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select data source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="demo">Demo Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newDataSource.description || ""}
                onChange={(e) => setNewDataSource({ ...newDataSource, description: e.target.value })}
                placeholder="Monthly sales data by product category"
              />
            </div>

            {(newDataSource.type === "json" || newDataSource.type === "csv" || newDataSource.type === "api") && (
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={newDataSource.config?.url || ""}
                  onChange={(e) =>
                    setNewDataSource({
                      ...newDataSource,
                      config: { ...newDataSource.config, url: e.target.value },
                    })
                  }
                  placeholder="https://example.com/data.json"
                />
              </div>
            )}

            {newDataSource.type === "demo" && (
              <div className="grid gap-2">
                <Label htmlFor="demoCategory">Demo Category</Label>
                <Select
                  value={newDataSource.config?.demoCategory || "sales"}
                  onValueChange={(value) =>
                    setNewDataSource({
                      ...newDataSource,
                      config: { ...newDataSource.config, demoCategory: value },
                    })
                  }
                >
                  <SelectTrigger id="demoCategory">
                    <SelectValue placeholder="Select demo data category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Data</SelectItem>
                    <SelectItem value="website">Website Analytics</SelectItem>
                    <SelectItem value="finance">Financial Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(newDataSource.type === "json" || newDataSource.type === "csv" || newDataSource.type === "api") && (
              <div className="grid gap-2">
                <Label htmlFor="refreshInterval">Refresh Interval (minutes)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  min="0"
                  value={newDataSource.config?.refreshInterval || ""}
                  onChange={(e) =>
                    setNewDataSource({
                      ...newDataSource,
                      config: { ...newDataSource.config, refreshInterval: Number.parseInt(e.target.value) || 0 },
                    })
                  }
                  placeholder="60"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDataSource}>Add Data Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
