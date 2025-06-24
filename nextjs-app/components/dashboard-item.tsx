// components/dashboard-item.tsx 

"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import type { DashboardItem as DashboardItemType } from "@/lib/types"
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
  item: DashboardItemType
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
  dashboardItems?: DashboardItemType[]
  getFilteredData?: (item: DashboardItemType) => any
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
      try {
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
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in keyboard handler:", error)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isActive, editable, item.id, onRemove, onDuplicate])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log("DASHBOARD ITEM - Mouse down:", { itemId: item.id, editable })
      try {
        if (!editable) return
        e.stopPropagation()
        onSelect()
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleMouseDown:", error)
      }
    },
    [editable, onSelect, item.id],
  )

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      try {
        console.log("DASHBOARD ITEM - Drag start:", {
          itemId: item.id,
          editable,
          clientX: e.clientX,
          clientY: e.clientY,
          currentPosition: { x: item.x, y: item.y },
        })

        if (!editable) return
        e.stopPropagation()
        e.preventDefault()

        onSelect()
        dragStartPos.current = { x: e.clientX, y: e.clientY }

        const handleMouseMove = (e: MouseEvent) => {
          try {
            if (
              !dragStartPos.current ||
              typeof dragStartPos.current.x !== "number" ||
              typeof dragStartPos.current.y !== "number" ||
              typeof e.clientX !== "number" ||
              typeof e.clientY !== "number" ||
              isNaN(e.clientX) ||
              isNaN(e.clientY)
            ) {
              console.warn("DASHBOARD ITEM - Invalid drag position data", {
                dragStartPos: dragStartPos.current,
                clientX: e.clientX,
                clientY: e.clientY,
              })
              return
            }

            const dx = e.clientX - dragStartPos.current.x
            const dy = e.clientY - dragStartPos.current.y

            if (isNaN(dx) || isNaN(dy)) {
              console.warn("DASHBOARD ITEM - Computed dx/dy are NaN", { dx, dy })
              return
            }

            console.log("DASHBOARD ITEM - Mouse move during drag:", {
              itemId: item.id,
              dx,
              dy,
              newClientPos: { x: e.clientX, y: e.clientY },
              dragStartPos: dragStartPos.current,
            })

            dragStartPos.current = { x: e.clientX, y: e.clientY }

            onDrag(item.id, dx, dy)
            console.log("DASHBOARD ITEM - onDrag called successfully")
          } catch (error) {
            console.error("DASHBOARD ITEM - Error in drag mouse move:", error)
          }
        }

        const handleMouseUp = () => {
          console.log("DASHBOARD ITEM - Drag end:", { itemId: item.id })
          try {
            dragStartPos.current = null
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          } catch (error) {
            console.error("DASHBOARD ITEM - Error in drag mouse up:", error)
          }
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleDragStart:", error)
      }
    },
    [editable, item.id, item.x, item.y, onDrag, onSelect],
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      try {
        console.log("DASHBOARD ITEM - Resize start:", {
          itemId: item.id,
          corner,
          editable,
          currentSize: { width: item.width, height: item.height },
          currentPosition: { x: item.x, y: item.y },
        })

        if (!editable) {
          console.log("DASHBOARD ITEM - Not editable, skipping resize")
          return
        }

        e.stopPropagation()
        e.preventDefault()

        onSelect()

        // Ensure initial values are valid numbers
        const initialWidth = Number(item.width) || 100
        const initialHeight = Number(item.height) || 100

        resizeStartData.current = {
          width: initialWidth,
          height: initialHeight,
          x: e.clientX,
          y: e.clientY,
        }

        const handleMouseMove = (e: MouseEvent) => {
          try {
            if (!resizeStartData.current) {
              console.log("DASHBOARD ITEM - No resize start data, skipping")
              return
            }

            // Define minimum and maximum dimensions
            const minSize = 50
            const maxSize = 2000

            let newWidth = resizeStartData.current.width
            let newHeight = resizeStartData.current.height
            let newX = item.x
            let newY = item.y

            // Calculate delta values with bounds checking
            const deltaX = Number(e.clientX) - Number(resizeStartData.current.x)
            const deltaY = Number(e.clientY) - Number(resizeStartData.current.y)

            // Handle horizontal resizing
            if (corner.includes("right")) {
              newWidth = Math.max(minSize, Math.min(resizeStartData.current.width + deltaX, maxSize))
            }

            if (corner.includes("left")) {
              const widthChange = Math.max(-resizeStartData.current.width + minSize, Math.min(deltaX, maxSize))
              const newPotentialWidth = Math.max(
                minSize,
                Math.min(resizeStartData.current.width - widthChange, maxSize),
              )

              if (newPotentialWidth !== resizeStartData.current.width) {
                newX = item.x + (resizeStartData.current.width - newPotentialWidth)
                newWidth = newPotentialWidth
              }
            }

            // Handle vertical resizing
            if (corner.includes("bottom")) {
              newHeight = Math.max(minSize, Math.min(resizeStartData.current.height + deltaY, maxSize))
            }

            if (corner.includes("top")) {
              const heightChange = Math.max(-resizeStartData.current.height + minSize, Math.min(deltaY, maxSize))
              const newPotentialHeight = Math.max(
                minSize,
                Math.min(resizeStartData.current.height - heightChange, maxSize),
              )

              if (newPotentialHeight !== resizeStartData.current.height) {
                newY = item.y + (resizeStartData.current.height - newPotentialHeight)
                newHeight = newPotentialHeight
              }
            }

            // Ensure values are valid numbers
            const validatedWidth = Math.max(minSize, Math.min(maxSize, Number(newWidth) || minSize))
            const validatedHeight = Math.max(minSize, Math.min(maxSize, Number(newHeight) || minSize))
            const validatedX = Number(newX) || item.x
            const validatedY = Number(newY) || item.y

            // Apply changes
            onResize(item.id, validatedWidth, validatedHeight)

            console.log("DASHBOARD ITEM - Resizing:", {
              validatedWidth,
              validatedHeight,
              validatedX,
              validatedY,
            })

            // If position changed, update it through onDrag
            if (validatedX !== item.x || validatedY !== item.y) {
              onDrag(item.id, validatedX - item.x, validatedY - item.y)
            }
          } catch (error) {
            console.error("DASHBOARD ITEM - Error in resize mouse move:", error)
          }
        }

        const handleMouseUp = () => {
          try {
            console.log("DASHBOARD ITEM - Resize end:", { itemId: item.id })
            resizeStartData.current = null
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          } catch (error) {
            console.error("DASHBOARD ITEM - Error in resize mouse up:", error)
          }
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleResizeStart:", error)
      }
    },
    [editable, item, onResize, onSelect, onDrag],
  )

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      try {
        e.stopPropagation()
        onOpenSettings()
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleSettingsClick:", error)
      }
    },
    [onOpenSettings],
  )

  const handleRemoveClick = useCallback(() => {
    try {
      onRemove(item.id)
    } catch (error) {
      console.error("DASHBOARD ITEM - Error in handleRemoveClick:", error)
    }
  }, [item.id, onRemove])

  const handleDuplicateClick = useCallback(() => {
    try {
      if (onDuplicate) {
        onDuplicate(item.id)
      }
    } catch (error) {
      console.error("DASHBOARD ITEM - Error in handleDuplicateClick:", error)
    }
  }, [item.id, onDuplicate])

  const handleDataEditorOpen = useCallback(() => {
    try {
      setShowDataEditor(true)
    } catch (error) {
      console.error("DASHBOARD ITEM - Error in handleDataEditorOpen:", error)
    }
  }, [])

  const handleDataEditorClose = useCallback(() => {
    try {
      setShowDataEditor(false)
    } catch (error) {
      console.error("DASHBOARD ITEM - Error in handleDataEditorClose:", error)
    }
  }, [])

  const handleContentChange = useCallback(
    (content: any) => {
      try {
        onContentChange(item.id, content)
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleContentChange:", error)
      }
    },
    [item.id, onContentChange],
  )

  const handleConfigChange = useCallback(
    (config: any) => {
      try {
        onConfigChange(item.id, config)
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleConfigChange:", error)
      }
    },
    [item.id, onConfigChange],
  )

  const handleFilterApply = useCallback(
    (filterValue: any) => {
      try {
        if (onFilterApply) {
          onFilterApply(item.id, filterValue)
        }
      } catch (error) {
        console.error("DASHBOARD ITEM - Error in handleFilterApply:", error)
      }
    },
    [item.id, onFilterApply],
  )

  const renderResizeHandles = () => {
    if (!isActive || !editable) return null

    console.log("DASHBOARD ITEM - About to render main component with:", {
      itemId: item.id,
      position: { x: item.x, y: item.y },
      size: { width: item.width, height: item.height },
      zIndex: item.zIndex,
      isActive,
      editable,
    })

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
  const renderComponent = useCallback(() => {
    try {
      // Log the item type and normalized type
      const chartType = normalizeChartType(item.type)
      console.log("DASHBOARD ITEM - Rendering component:", {
        originalType: item.type,
        normalizedType: chartType,
        itemId: item.id,
        //content: item.content,
      })

      // Extract the actual chart data
      let chartData: any[] = []
      if (Array.isArray(item.content)) {
        chartData = item.content
      } else if (typeof item.content === "object" && item.content !== null) {
        // Handle case where content might be an object with data property
        chartData = Array.isArray(item.content.data) ? item.content.data : []
      }

      console.log("DASHBOARD ITEM - Final render start", {
        itemId: item.id,
        width: item.width,
        height: item.height,
      });


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
        return (
          <ChartComponent
            type={item.type}
            data={chartData}
            config={{
              ...item.config,
              labelKey: item.config?.xField || "name",
              valueKey: item.config?.yField || "value",
            }}
          />
        )
      }

      // Then check for other types and camelCase chart types
      switch (item.type) {
        case "text":
          // Ensure content is a string for TextComponent
          const textContent =
            typeof item.content === "string"
              ? item.content
              : Array.isArray(item.content)
                ? item.content.join("\n")
                : JSON.stringify(item.content)

          return (
            <TextComponent
              content={textContent}
              onContentChange={handleContentChange}
              editable={editable}
              config={item.config}
            />
          )
        case "image":
          // Ensure src is a string for ImageComponent
          const imageSrc =
            typeof item.content === "string"
              ? item.content
              : Array.isArray(item.content)
                ? item.content[0] || "/placeholder.svg" // Use first item if array
                : typeof item.content === "object" && item.content !== null
                  ? item.content.src || item.content.url || "/placeholder.svg" // Try common object properties
                  : "/placeholder.svg" // Fallback

          return <ImageComponent src={imageSrc || "/placeholder.svg"} onContentChange={handleContentChange} />
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
          return <ChartComponent type={normalizeChartType(item.type)} data={chartData} config={item.config} />
        }
        default:
          console.error("DASHBOARD ITEM - Unknown component type:", item.type)
          return <div>Unknown component type: {item.type}</div>
      }
    } catch (error) {
      console.error("DASHBOARD ITEM - Error in renderComponent:", error)
      return <div>Error rendering component</div>
    }
  }, [item.type, item.content, item.config, handleContentChange, editable])

  // Check if we should use the card layout
  const useCardLayout = item.config?.useCardLayout === true
  const cardTitle = item.config?.cardTitle || ""
  const cardDescription = item.config?.cardDescription || ""
  const cardFooter = item.config?.cardFooter || ""
  const cardTitleAlign = item.config?.cardTitleAlign || "left"
  const cardFooterAlign = item.config?.cardFooterAlign || "left"
  const cardDescriptionAlign = item.config?.cardDescriptionAlign || "left"

  try {
    return (
      <>
        <div
          ref={itemRef}
          className={`absolute rounded-lg overflow-hidden border backdrop-blur-sm transition-all duration-200 ${
            isActive
              ? "border-primary shadow-lg shadow-primary/20"
              : isHovered && editable
                ? "border-border/80 shadow-md"
                : "border-transparent"
            }`}
          style={{
            width: typeof item.width === "number" && !isNaN(item.width) ? `${item.width}px` : "100px",
            height: typeof item.height === "number" && !isNaN(item.height) ? `${item.height}px` : "100px",
            transform:
              typeof item.x === "number" && !isNaN(item.x) && typeof item.y === "number" && !isNaN(item.y)
                ? `translate(${item.x}px, ${item.y}px)`
                : "translate(0px, 0px)",
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
                    : item.type === "bar-chart" ||
                        item.type === "line-chart" ||
                        item.type === "pie-chart" ||
                        item.type === "area-chart" ||
                        item.type === "scatter-chart" ||
                        item.type === "radar-chart" ||
                        item.type === "radial-chart"
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
  } catch (error) {
    console.error("DASHBOARD ITEM - Error in main render:", error)
    console.error("DASHBOARD ITEM - Error stack:", error.stack)
    return <div>Error rendering dashboard item</div>
  }
}

export default DashboardItem
