// components/dashboard-item.tsx 

"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import type { DashboardItem } from "@/lib/types"
import ChartComponent from "./chart-component"
import TextComponent from "./text-component"
import ImageComponent from "./image-component"
import FilterComponent from "./filter-component"
import TabsComponent from "./tabs-component"
import ChartDataEditor from "./chart-data-editor"
import { Button } from "@/components/ui/button"
import { Trash, Move, Database, Settings, Copy } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardItemProps {
  item: DashboardItem
  isActive: boolean
  editable: boolean
  onSelect: () => void
  onOpenSettings: () => void
  onDrag: (id: string, dx: number, dy: number) => void
  onResize: (id: string, width: number, height: number) => void
  onContentChange: (id: string, content: any) => void
  onConfigChange: (id: string, config: any) => void
  onRemove: (id: string) => void
  onDuplicate?: (id: string) => void
  onFilterApply?: (filterId: string, filterValue: any) => void
  dashboardItems?: DashboardItem[]
  getFilteredData?: (item: DashboardItem) => any
  onClose: () => void
}

const DashboardItem: React.FC<DashboardItemProps> = ({
  item,
  isActive,
  editable,
  onSelect,
  onOpenSettings,
  onDrag,
  onResize,
  onContentChange,
  onConfigChange,
  onRemove,
  onDuplicate,
  onFilterApply,
  dashboardItems = [],
  getFilteredData,
  onClose,
}) => {
  const [showDataEditor, setShowDataEditor] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const resizeStartData = useRef<{ width: number; height: number; x: number; y: number } | null>(null)

  // Add keyboard shortcut for delete
  useEffect(() => {
    if (!isActive || !editable) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if the user is editing text in an input, textarea, or contentEditable element
      const activeElement = document.activeElement
      const isEditingText =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true"

      if (isEditingText) return

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        onRemove(item.id)
      } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (onDuplicate) onDuplicate(item.id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isActive, editable, item.id, onRemove, onDuplicate])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editable) return
      e.stopPropagation()
      onSelect()
    },
    [editable, onSelect],
  )

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!editable) return
      e.stopPropagation()
      e.preventDefault()

      onSelect()
      dragStartPos.current = { x: e.clientX, y: e.clientY }

      const handleMouseMove = (e: MouseEvent) => {
        if (!dragStartPos.current) return

        const dx = e.clientX - dragStartPos.current.x
        const dy = e.clientY - dragStartPos.current.y

        dragStartPos.current = { x: e.clientX, y: e.clientY }
        onDrag(item.id, dx, dy)
      }

      const handleMouseUp = () => {
        dragStartPos.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [editable, item.id, onDrag, onSelect],
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      if (!editable) return
      e.stopPropagation()
      e.preventDefault()

      onSelect()
      resizeStartData.current = {
        width: item.width,
        height: item.height,
        x: e.clientX,
        y: e.clientY,
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeStartData.current) return

        let newWidth = resizeStartData.current.width
        let newHeight = resizeStartData.current.height
        let newX = item.x
        let newY = item.y
        const id = item.id

        const minWidth = 100
        const minHeight = 100

        // Handle horizontal resizing
        if (corner.includes("right")) {
          newWidth = Math.max(minWidth, resizeStartData.current.width + (e.clientX - resizeStartData.current.x))
        }

        if (corner.includes("left")) {
          const deltaX = e.clientX - resizeStartData.current.x
          const newPotentialWidth = Math.max(minWidth, resizeStartData.current.width - deltaX)

          if (newPotentialWidth !== resizeStartData.current.width) {
            // Only update x position if width actually changed
            newX = item.x + (resizeStartData.current.width - newPotentialWidth)
            newWidth = newPotentialWidth
          }
        }

        // Handle vertical resizing
        if (corner.includes("bottom")) {
          newHeight = Math.max(minHeight, resizeStartData.current.height + (e.clientY - resizeStartData.current.y))
        }

        if (corner.includes("top")) {
          const deltaY = e.clientY - resizeStartData.current.y
          const newPotentialHeight = Math.max(minHeight, resizeStartData.current.height - deltaY)

          if (newPotentialHeight !== resizeStartData.current.height) {
            // Only update y position
            newY = item.y + (resizeStartData.current.height - newPotentialHeight)
            newHeight = newPotentialHeight
          }
        }

        // Apply changes
        onResize(id, newWidth, newHeight)

        // If position changed, update it
        if (newX !== item.x || newY !== item.y) {
          onDrag(item.id, newX - item.x, newY - item.y)
        }
      }

      const handleMouseUp = () => {
        resizeStartData.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [editable, item, onResize, onSelect, onDrag],
  )

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onOpenSettings()
    },
    [onOpenSettings],
  )

  const handleRemoveClick = useCallback(() => {
    onRemove(item.id)
  }, [item.id, onRemove])

  const handleDuplicateClick = useCallback(() => {
    if (onDuplicate) {
      onDuplicate(item.id)
    }
  }, [item.id, onDuplicate])

  const handleDataEditorOpen = useCallback(() => {
    setShowDataEditor(true)
  }, [])

  const handleDataEditorClose = useCallback(() => {
    setShowDataEditor(false)
  }, [])

  const handleContentChange = useCallback(
    (content: any) => {
      onContentChange(item.id, content)
    },
    [item.id, onContentChange],
  )

  const handleConfigChange = useCallback(
    (config: any) => {
      onConfigChange(item.id, config)
    },
    [item.id, onConfigChange],
  )

  const handleFilterApply = useCallback(
    (filterValue: any) => {
      if (onFilterApply) {
        onFilterApply(item.id, filterValue)
      }
    },
    [item.id, onFilterApply],
  )

  const renderResizeHandles = () => {
    if (!isActive || !editable) return null

    return (
      <>
        {/* Corner handles */}
        <div
          className="absolute w-3 h-3 bg-primary right-0 bottom-0 cursor-se-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "right-bottom")}
        />
        <div
          className="absolute w-3 h-3 bg-primary left-0 bottom-0 cursor-sw-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "left-bottom")}
        />
        <div
          className="absolute w-3 h-3 bg-primary right-0 top-0 cursor-ne-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "right-top")}
        />
        <div
          className="absolute w-3 h-3 bg-primary left-0 top-0 cursor-nw-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "left-top")}
        />

        {/* Side handles */}
        <div
          className="absolute w-3 h-3 bg-primary right-0 top-1/2 -translate-y-1/2 cursor-e-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "right")}
        />
        <div
          className="absolute w-3 h-3 bg-primary bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "bottom")}
        />
        <div
          className="absolute w-3 h-3 bg-primary left-0 top-1/2 -translate-y-1/2 cursor-w-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "left")}
        />
        <div
          className="absolute w-3 h-3 bg-primary top-0 left-1/2 -translate-x-1/2 cursor-n-resize z-20 rounded-full"
          onMouseDown={(e) => handleResizeStart(e, "top")}
        />
      </>
    )
  }

  const renderItemActions = () => {
    if ((!isActive && !isHovered) || !editable) return null

    const isChartType =
      item.type === "bar-chart" ||
      item.type === "line-chart" ||
      item.type === "pie-chart" ||
      item.type === "area-chart" ||
      item.type === "scatter-chart" ||
      item.type === "radar-chart" ||
      item.type === "radial-chart"

    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 right-0 flex flex-col gap-1 p-1 bg-background/80 backdrop-blur-sm border border-border/40 rounded-l-md shadow-sm z-20"
      >
        <TooltipProvider>
          {isChartType && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleDataEditorOpen}
                >
                  <Database className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Edit Chart Data</p>
              </TooltipContent>
            </Tooltip>
          )}

          {onDuplicate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleDuplicateClick}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Duplicate Item (Ctrl+D)</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemoveClick}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Delete Item (Delete key)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    )
  }

  // Add a helper function to normalize chart types
  const normalizeChartType = (type: string) => {
    // Convert simple types to kebab-case
    if (type === "bar") return "bar-chart"
    if (type === "line") return "line-chart"
    if (type === "pie") return "pie-chart"
    if (type === "area") return "area-chart"
    if (type === "scatter") return "scatter-chart"
    if (type === "radar") return "radar-chart"
    if (type === "radial") return "radial-chart"

    // Convert camelCase to kebab-case if needed
    if (type === "barChart") return "bar-chart"
    if (type === "lineChart") return "line-chart"
    if (type === "pieChart") return "pie-chart"
    if (type === "areaChart") return "area-chart"
    if (type === "scatterChart") return "scatter-chart"
    if (type === "radarChart") return "radar-chart"
    if (type === "radialChart") return "radial-chart"
    return type
  }

  // Add logging to the renderComponent function to see how the type is being processed
  const renderComponent = () => {
    // Log the item type and normalized type
    const chartType = normalizeChartType(item.type)
    console.log("DASHBOARD ITEM - Rendering component:", {
      originalType: item.type,
      normalizedType: chartType,
      itemId: item.id,
      content: item.content,
    })

    // Extract the actual chart data
    let chartData: any[] = []
    if (Array.isArray(item.content)) {
      chartData = item.content
    } else if (typeof item.content === 'object' && item.content !== null) {
      // Handle case where content might be an object with data property
      chartData = Array.isArray(item.content.data) ? item.content.data : []
    }

    // First check if it's a chart type in kebab-case format
    if (
      item.type === "bar-chart" ||
      item.type === "line-chart" ||
      item.type === "pie-chart" ||
      item.type === "area-chart" ||
      item.type === "scatter-chart" ||
      item.type === "radar-chart" ||
      item.type === "radial-chart"
    ) {
      // const chartData = getFilteredData ? getFilteredData(item) : item.content
      console.log("CHART COMPONENT - Rendering chart:", {
        type: item.type,
        hasData: !!chartData,
        hasConfig: !!item.config,
        chartData: chartData,
      })
      return <ChartComponent
        type={item.type}
        data={chartData}
        config={{
          ...item.config,
          labelKey: item.config?.xField || "name",
          valueKey: item.config?.yField || "value"
        }}
      />
    }

    // Then check for other types and camelCase chart types
    switch (item.type) {
      case "text":
        return (
          <TextComponent
            content={item.content}
            onContentChange={handleContentChange}
            editable={editable}
            config={item.config}
          />
        )
      case "image":
        return <ImageComponent src={item.content || "/placeholder.svg"} onContentChange={handleContentChange} />
      case "filter":
        return (
          <FilterComponent
            content={item.content}
            config={item.config}
            onContentChange={handleContentChange}
            onConfigChange={handleConfigChange}
            dashboardItems={dashboardItems}
            onFilterApply={handleFilterApply}
          />
        )
      case "tabs":
        return (
          <TabsComponent
            content={item.content}
            config={item.config}
            onContentChange={handleContentChange}
            onConfigChange={handleConfigChange}
            editable={editable}
          />
        )
      case "barChart":
      case "lineChart":
      case "pieChart":
      case "areaChart":
      case "scatterChart":
      case "radarChart":
      case "radialChart": {
        const chartData = getFilteredData ? getFilteredData(item) : item.content
        console.log("CHART COMPONENT - Rendering chart:", {
          type: normalizeChartType(item.type),
          hasData: !!chartData,
          hasConfig: !!item.config,
        })
        return <ChartComponent type={normalizeChartType(item.type)} data={chartData} config={item.config} />
      }
      default:
        console.error("DASHBOARD ITEM - Unknown component type:", item.type)
        return <div>Unknown component type: {item.type}</div>
    }
  }

  // Check if we should use the card layout
  const useCardLayout = item.config?.useCardLayout === true
  const cardTitle = item.config?.cardTitle || ""
  const cardDescription = item.config?.cardDescription || ""
  const cardFooter = item.config?.cardFooter || ""
  const cardTitleAlign = item.config?.cardTitleAlign || "left"
  const cardFooterAlign = item.config?.cardFooterAlign || "left"
  const cardDescriptionAlign = item.config?.cardDescriptionAlign || "left"

  return (
    <>
      <div
        ref={itemRef}
        className={`absolute rounded-lg overflow-hidden border backdrop-blur-sm transition-all duration-200 ${isActive
          ? "border-primary shadow-lg shadow-primary/20"
          : isHovered && editable
            ? "border-border/80 shadow-md"
            : "border-transparent"
          }`}
        style={{
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `translate(${item.x}px, ${item.y}px)`,
          transition: dragStartPos.current ? "none" : "box-shadow 0.2s, border-color 0.2s",
          zIndex: item.zIndex || (isActive ? 10 : 1),
          pointerEvents: "auto",
        }}
        onClick={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag handle with improved styling */}
        {editable && (
          <div
            className="absolute top-0 left-0 right-0 h-6 bg-background/80 backdrop-blur-sm cursor-move flex items-center px-2 z-10 hover:bg-accent/20 transition-colors"
            onMouseDown={handleDragStart}
          >
            <Move className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-xs font-medium text-foreground truncate flex-1">
              {item.type === "tabs"
                ? item.config?.title || "Tabs"
                : item.type === "filter"
                  ? item.config?.title || "Filter"
                  : item.type === "barChart" ||
                    item.type === "lineChart" ||
                    item.type === "pieChart" ||
                    item.type === "areaChart" ||
                    item.type === "scatterChart" ||
                    item.type === "radarChart" ||
                    item.type === "radialChart"
                    ? item.config?.title || "Untitled Chart"
                    : item.type}
            </span>

            {/* Add settings icon */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-1 text-muted-foreground hover:text-foreground"
              onClick={handleSettingsClick}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Content */}
        {useCardLayout ? (
          <Card className="h-full border-0 bg-background/40 flex flex-col">
            {(cardTitle || editable) && (
              <CardHeader className={`${editable ? "pt-8" : "pt-4"} pb-2 text-${cardTitleAlign} flex-shrink-0`}>
                {cardTitle && <CardTitle>{cardTitle}</CardTitle>}
                {cardDescription && (
                  <CardDescription className={`text-${cardDescriptionAlign}`}>{cardDescription}</CardDescription>
                )}
              </CardHeader>
            )}
            <CardContent className="p-4 flex-grow overflow-hidden">
              <div className="h-full w-full">{renderComponent()}</div>
            </CardContent>
            {cardFooter && (
              <CardFooter className={`pt-2 pb-4 text-${cardFooterAlign} flex-shrink-0`}>
                <p className="text-sm text-muted-foreground">{cardFooter}</p>
              </CardFooter>
            )}
          </Card>
        ) : (
          <div className={`${editable ? "p-2 pt-8" : "p-0"} h-full box-border overflow-auto bg-background/40`}>
            {renderComponent()}
          </div>
        )}

        {renderItemActions()}
        {renderResizeHandles()}
      </div>

      {/* Chart data editor */}
      {showDataEditor && isActive && editable && (
        <ChartDataEditor
          data={item.content}
          chartType={item.type}
          onDataChange={handleContentChange}
          onClose={handleDataEditorClose}
        />
      )}
    </>
  )
}

export default DashboardItem
