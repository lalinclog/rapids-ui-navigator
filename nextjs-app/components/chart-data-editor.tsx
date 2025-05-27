// components/chart-data-editor
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash, X, Save, Database } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import DatasetSelector from "./data-source/dataset-selector"

interface ChartDataEditorProps {
  data: any[]
  chartType: string
  onDataChange: (data: any[]) => void
  onClose: () => void
}

export default function ChartDataEditor({ data, chartType, onDataChange, onClose }: ChartDataEditorProps) {
  const { toast } = useToast()
  const [editableData, setEditableData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [newColumnName, setNewColumnName] = useState("")
  const [activeTab, setActiveTab] = useState<"manual" | "dataset">("manual")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [labelColumn, setLabelColumn] = useState<string>("name")
  const [valueColumns, setValueColumns] = useState<string[]>(["value"])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<"none" | "asc" | "desc">("none")
  const [sortColumn, setSortColumn] = useState<string>("value")
  const [scaleType, setScaleType] = useState<"linear" | "log">("linear")
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [sortColumn, setSortColumn] = useState<string>("value") // Removed duplicate declaration

  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  // Initialize the editable data and columns
  useEffect(() => {
    if (data && data.length > 0) {
      setEditableData([...data])

      // Extract column names from the first data item
      const firstItem = data[0]
      const cols = Object.keys(firstItem)
      setColumns(cols)
      setAvailableColumns(cols)

      // Set default label and value columns based on chart type
      if (cols.includes("name")) {
        setLabelColumn("name")
      } else {
        setLabelColumn(cols[0])
      }

      // For value columns, select all numeric columns except the label column
      const numericColumns = cols.filter((col) => col !== labelColumn && typeof firstItem[col] === "number")

      if (numericColumns.length > 0) {
        setValueColumns(numericColumns)
        setSortColumn(numericColumns[0])
      } else if (cols.length > 1) {
        setValueColumns([cols[1]])
        setSortColumn(cols[1])
      }
    } else {
      // Default empty data with name and value columns
      setEditableData([{ name: "", value: 0 }])
      setColumns(["name", "value"])
      setAvailableColumns(["name", "value"])
      setLabelColumn("name")
      setValueColumns(["value"])
      setSortColumn("value")
    }
  }, [data])

  const handleCellChange = (rowIndex: number, columnName: string, value: string) => {
    const newData = [...editableData]

    // Convert to number if the column is not the label column
    if (columnName !== labelColumn && !isNaN(Number(value))) {
      newData[rowIndex][columnName] = Number(value)
    } else {
      newData[rowIndex][columnName] = value
    }

    setEditableData(newData)
  }

  const addRow = () => {
    const newRow: any = {}
    columns.forEach((col) => {
      newRow[col] = valueColumns.includes(col) ? 0 : ""
    })
    setEditableData([...editableData, newRow])
  }

  const removeRow = (index: number) => {
    if (editableData.length <= 1) {
      toast({
        title: "Cannot remove row",
        description: "You must have at least one data row.",
        variant: "destructive",
      })
      return
    }

    const newData = [...editableData]
    newData.splice(index, 1)
    setEditableData(newData)
  }

  const addColumn = () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Invalid column name",
        description: "Please enter a valid column name.",
        variant: "destructive",
      })
      return
    }

    if (columns.includes(newColumnName)) {
      toast({
        title: "Column already exists",
        description: "Please enter a unique column name.",
        variant: "destructive",
      })
      return
    }

    // Add the new column to all data items
    const newData = editableData.map((item) => ({
      ...item,
      [newColumnName]: 0,
    }))

    const newColumns = [...columns, newColumnName]
    setEditableData(newData)
    setColumns(newColumns)
    setAvailableColumns(newColumns)
    setNewColumnName("")

    // If this is a numeric column, add it to value columns
    setValueColumns([...valueColumns, newColumnName])

    toast({
      title: "Column added",
      description: `Added new column "${newColumnName}"`,
    })
  }

  const removeColumn = (columnName: string) => {
    if (columns.length <= 2) {
      toast({
        title: "Cannot remove column",
        description: "You must have at least two columns (label and value).",
        variant: "destructive",
      })
      return
    }

    if (columnName === labelColumn) {
      toast({
        title: "Cannot remove label column",
        description: "The label column is required for the chart.",
        variant: "destructive",
      })
      return
    }

    // Remove the column from all data items
    const newData = editableData.map((item) => {
      const newItem = { ...item }
      delete newItem[columnName]
      return newItem
    })

    const newColumns = columns.filter((col) => col !== columnName)
    setEditableData(newData)
    setColumns(newColumns)
    setAvailableColumns(newColumns)

    // Remove from value columns if present
    if (valueColumns.includes(columnName)) {
      setValueColumns(valueColumns.filter((col) => col !== columnName))
    }

    // If the sort column is being removed, reset to the first value column
    if (sortColumn === columnName) {
      const remainingValueColumns = valueColumns.filter((col) => col !== columnName)
      if (remainingValueColumns.length > 0) {
        setSortColumn(remainingValueColumns[0])
      } else {
        setSortColumn("")
        setSortOption("none")
      }
    }
  }

  const sortData = () => {
    if (sortOption === "none" || !sortColumn) return editableData

    return [...editableData].sort((a, b) => {
      if (sortOption === "asc") {
        return a[sortColumn] - b[sortColumn]
      } else {
        return b[sortColumn] - a[sortColumn]
      }
    })
  }

  const handleSave = () => {
    // Validate data before saving
    const hasEmptyLabel = editableData.some((item) => !item[labelColumn]?.toString().trim())

    if (hasEmptyLabel) {
      toast({
        title: "Invalid data",
        description: `All rows must have a value for the label column "${labelColumn}".`,
        variant: "destructive",
      })
      return
    }

    // For radar and scatter charts, ensure we have the right structure
    if (chartType === "radar-chart" && valueColumns.length < 2) {
      toast({
        title: "Invalid data for radar chart",
        description: "Radar charts require at least 2 value columns.",
        variant: "destructive",
      })
      return
    }

    if (chartType === "scatter-chart" && (!columns.includes("x") || !columns.includes("y"))) {
      toast({
        title: "Invalid data for scatter chart",
        description: "Scatter charts require 'x' and 'y' columns.",
        variant: "destructive",
      })
      return
    }

    // Apply sorting if needed
    const finalData = sortOption !== "none" ? sortData() : editableData

    // Add scale type to the data as a metadata property
    const dataWithMetadata = finalData.map((item) => ({
      ...item,
      _metadata: {
        scaleType,
      },
    }))

    onDataChange(dataWithMetadata)
    onClose()

    toast({
      title: "Data saved",
      description: "Chart data has been updated successfully.",
    })
  }

  const handleDatasetSelect = (newData: any[]) => {
    if (newData && newData.length > 0) {
      setEditableData(newData)

      // Extract column names from the first data item
      const firstItem = newData[0]
      const cols = Object.keys(firstItem)
      setColumns(cols)
      setAvailableColumns(cols)

      // Try to intelligently set label and value columns
      const possibleLabelColumns = ["name", "category", "label", "title", "id"]
      let foundLabelColumn = cols.find((col) => possibleLabelColumns.includes(col.toLowerCase()))

      if (!foundLabelColumn) {
        // If no standard label column found, use the first string column
        foundLabelColumn = cols.find((col) => typeof firstItem[col] === "string")
      }

      if (foundLabelColumn) {
        setLabelColumn(foundLabelColumn)
      } else {
        setLabelColumn(cols[0])
      }

      // For value columns, select all numeric columns except the label column
      const numericColumns = cols.filter((col) => col !== foundLabelColumn && typeof firstItem[col] === "number")

      if (numericColumns.length > 0) {
        setValueColumns(numericColumns)
        setSortColumn(numericColumns[0])
      } else if (cols.length > 1) {
        setValueColumns([cols[1]])
        setSortColumn(cols[1])
      }

      toast({
        title: "Dataset loaded",
        description: `Loaded ${newData.length} rows of data from the selected dataset.`,
      })
    }
  }

  const isChartTypeMultiSeries = () => {
    return ["radar-chart", "area-chart", "line-chart"].includes(chartType)
  }

  const isChartTypeScatter = () => {
    return chartType === "scatter-chart"
  }

  const supportsScaleType = () => {
    return ["bar-chart", "line-chart", "area-chart"].includes(chartType)
  }

  const supportsSorting = () => {
    return ["bar-chart", "pie-chart", "radial-bar-chart"].includes(chartType)
  }

  const getColumnMappingSection = () => {
    if (isChartTypeScatter()) {
      return (
        <div className="space-y-4 p-4 border rounded-md">
          <h3 className="text-sm font-medium">Scatter Chart Axis Mapping</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="x-axis">X Axis</Label>
              <Select
                value={columns.includes("x") ? "x" : columns[0]}
                onValueChange={(value) => {
                  // Rename the column to "x" in the data
                  const oldXColumn = columns.find((col) => editableData[0][col] === editableData[0]["x"]) || columns[0]
                  const newData = editableData.map((item) => {
                    const newItem = { ...item }
                    newItem["x"] = newItem[value]
                    if (value !== oldXColumn) {
                      delete newItem[oldXColumn]
                    }
                    return newItem
                  })
                  setEditableData(newData)

                  // Update columns
                  const newColumns = columns.map((col) => (col === oldXColumn ? "x" : col))
                  setColumns(newColumns)
                  setAvailableColumns(newColumns)
                }}
              >
                <SelectTrigger id="x-axis">
                  <SelectValue placeholder="Select X axis column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="y-axis">Y Axis</Label>
              <Select
                value={columns.includes("y") ? "y" : columns[1] || columns[0]}
                onValueChange={(value) => {
                  // Rename the column to "y" in the data
                  const oldYColumn =
                    columns.find((col) => editableData[0][col] === editableData[0]["y"]) || columns[1] || columns[0]
                  const newData = editableData.map((item) => {
                    const newItem = { ...item }
                    newItem["y"] = newItem[value]
                    if (value !== oldYColumn) {
                      delete newItem[oldYColumn]
                    }
                    return newItem
                  })
                  setEditableData(newData)

                  // Update columns
                  const newColumns = columns.map((col) => (col === oldYColumn ? "y" : col))
                  setColumns(newColumns)
                  setAvailableColumns(newColumns)
                }}
              >
                <SelectTrigger id="y-axis">
                  <SelectValue placeholder="Select Y axis column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label-column">Label Column (optional)</Label>
            <Select value={labelColumn} onValueChange={setLabelColumn}>
              <SelectTrigger id="label-column">
                <SelectValue placeholder="Select label column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4 p-4 border rounded-md">
        <h3 className="text-sm font-medium">Column Mapping</h3>
        <div className="space-y-2">
          <Label htmlFor="label-column">Label Column</Label>
          <Select value={labelColumn} onValueChange={setLabelColumn}>
            <SelectTrigger id="label-column">
              <SelectValue placeholder="Select label column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">This column will be used for the X-axis or segment labels</p>
        </div>

        <div className="space-y-2">
          <Label>Value Columns</Label>
          <ScrollArea className="h-[80px] rounded-md border p-2">
            {columns.map((col) => (
              <div key={col} className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={`col-${col}`}
                  checked={valueColumns.includes(col)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValueColumns([...valueColumns, col])
                    } else {
                      if (valueColumns.length > 1) {
                        setValueColumns(valueColumns.filter((c) => c !== col))
                      } else {
                        toast({
                          title: "Cannot remove column",
                          description: "You must have at least one value column.",
                          variant: "destructive",
                        })
                      }
                    }
                  }}
                  disabled={col === labelColumn}
                />
                <Label htmlFor={`col-${col}`} className="text-sm">
                  {col} {col === labelColumn && "(label column)"}
                </Label>
              </div>
            ))}
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            {isChartTypeMultiSeries()
              ? "Select multiple columns to create a multi-series chart"
              : "Select the column to use for values"}
          </p>
        </div>
      </div>
    )
  }

  const getAdvancedOptionsSection = () => {
    return (
      <div className="space-y-4 p-4 border rounded-md mt-4">
        <h3 className="text-sm font-medium">Advanced Options</h3>

        {supportsSorting() && (
          <div className="space-y-2">
            <Label>Sort Data</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={sortColumn} onValueChange={setSortColumn} disabled={sortOption === "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column to sort by" />
                </SelectTrigger>
                <SelectContent>
                  {valueColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <RadioGroup
                value={sortOption}
                onValueChange={(value) => setSortOption(value as "none" | "asc" | "desc")}
                className="flex items-center space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="none" id="sort-none" />
                  <Label htmlFor="sort-none" className="text-xs">
                    None
                  </Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="asc" id="sort-asc" />
                  <Label htmlFor="sort-asc" className="text-xs">
                    Asc
                  </Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="desc" id="sort-desc" />
                  <Label htmlFor="sort-desc" className="text-xs">
                    Desc
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <p className="text-xs text-muted-foreground">Sort your data to better visualize patterns</p>
          </div>
        )}

        {supportsScaleType() && (
          <div className="space-y-2">
            <Label>Scale Type</Label>
            <RadioGroup
              value={scaleType}
              onValueChange={(value) => setScaleType(value as "linear" | "log")}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="linear" id="scale-linear" />
                <Label htmlFor="scale-linear" className="text-sm">
                  Linear
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="log" id="scale-log" />
                <Label htmlFor="scale-log" className="text-sm">
                  Logarithmic
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Logarithmic scale is useful for data with large value ranges
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Chart Data</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-4 pb-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "manual" | "dataset")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="dataset">Use Dataset</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="flex items-center gap-2 my-4">
                  <Input
                    placeholder="New column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button variant="outline" size="sm" onClick={addColumn}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Column
                  </Button>
                </div>

                {getColumnMappingSection()}

                <div className="overflow-auto border rounded-md max-h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column} className="relative min-w-[120px]">
                            <div className="flex items-center gap-1">
                              <span>{column}</span>
                              {column !== labelColumn && valueColumns.length > 1 && valueColumns.includes(column) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 ml-1"
                                  onClick={() => removeColumn(column)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editableData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {columns.map((column) => (
                            <TableCell key={`${rowIndex}-${column}`} className="p-2">
                              <Input
                                value={row[column] !== undefined ? row[column] : ""}
                                onChange={(e) => handleCellChange(rowIndex, column, e.target.value)}
                                type={valueColumns.includes(column) ? "number" : "text"}
                                className="h-8"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="p-2 w-[50px]">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(rowIndex)}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4">
                  <Button variant="outline" onClick={addRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Row
                  </Button>
                </div>

                {getAdvancedOptionsSection()}
              </TabsContent>

              <TabsContent value="dataset" className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 border rounded-md">
                  <Database className="h-12 w-12 mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Dataset</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Choose from available datasets or connect to external data sources
                  </p>
                  <DatasetSelector
                    onDataSelect={handleDatasetSelect}
                    currentData={editableData}
                    buttonVariant="default"
                    buttonText="Browse Datasets"
                  />

                  {editableData.length > 0 && (
                    <div className="mt-6 w-full">
                      <h4 className="text-sm font-medium mb-2">Preview ({editableData.length} rows)</h4>
                      <div className="border rounded-md overflow-auto max-h-[200px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {columns.map((column) => (
                                <TableHead key={column}>{column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editableData.slice(0, 5).map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {columns.map((column) => (
                                  <TableCell key={`${rowIndex}-${column}`}>
                                    {row[column] !== undefined ? String(row[column]) : ""}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {editableData.length > 5 && (
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          Showing 5 of {editableData.length} rows
                        </p>
                      )}
                    </div>
                  )}

                  {editableData.length > 0 && (
                    <>
                      <div className="mt-4 w-full">{getColumnMappingSection()}</div>
                      {getAdvancedOptionsSection()}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
