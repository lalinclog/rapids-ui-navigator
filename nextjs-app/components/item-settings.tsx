"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type } from "lucide-react"
import type { DashboardItem } from "@/lib/types"

interface ItemSettingsProps {
  item: DashboardItem
  onConfigChange: (config: any) => void
  onContentChange: (content: any) => void
  onClose: () => void
}

export default function ItemSettings({ item, onConfigChange, onContentChange, onClose }: ItemSettingsProps) {
  const [activeTab, setActiveTab] = useState("general")
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [colorIndex, setColorIndex] = useState<number | null>(null)
  const [config, setConfig] = useState(item.config || {})

  // Update local config when item changes
  useEffect(() => {
    setConfig(item.config || {})
  }, [item])

  // Update parent component when config changes
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleColorChange = (color: string) => {
    if (colorIndex !== null && item.config?.colors) {
      const newColors = [...item.config.colors]
      newColors[colorIndex] = color
      onConfigChange({ colors: newColors })
    }
  }

  const renderTypeSpecificSettings = () => {
    switch (item.type) {
      case "filter":
        return renderFilterSettings()
      case "text":
        return renderTextSettings()
      case "image":
        return renderImageSettings()
      case "bar-chart":
      case "line-chart":
      case "pie-chart":
      case "area-chart":
      case "scatter-chart":
      case "radar-chart":
      case "radial-chart":
        return renderChartSettings()
      default:
        return null
    }
  }

  const renderFilterSettings = () => {
    const chartItems = dashboardItems.filter((item) =>
      ["bar-chart", "line-chart", "pie-chart", "area-chart"].includes(item.type),
    )

    return (
      <>
        <div className="space-y-2">
          <Label>Filter Type</Label>
          <Select
            value={config.filterType || "select"}
            onValueChange={(value) => handleConfigChange("filterType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select">Multi-select</SelectItem>
              <SelectItem value="range">Range Slider</SelectItem>
              <SelectItem value="search">Search</SelectItem>
              <SelectItem value="toggle">Toggle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Filter Field</Label>
          <Input
            value={config.filterField || ""}
            onChange={(e) => handleConfigChange("filterField", e.target.value)}
            placeholder="Data field to filter on"
          />
          <p className="text-xs text-muted-foreground">The property name in your data objects to filter on.</p>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Filter Title</Label>
          <Input
            value={config.title || "Filter"}
            onChange={(e) => handleConfigChange("title", e.target.value)}
            placeholder="Filter label"
          />
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label>Target Charts</Label>
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="target-all"
              checked={config.targetCharts === "all"}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleConfigChange("targetCharts", "all")
                } else {
                  handleConfigChange("targetCharts", [])
                }
              }}
            />
            <Label htmlFor="target-all">Apply to all charts</Label>
          </div>

          {config.targetCharts !== "all" && (
            <ScrollArea className="h-[150px] rounded-md border p-2">
              {chartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No charts available</p>
              ) : (
                chartItems.map((chartItem) => (
                  <div key={chartItem.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`chart-${chartItem.id}`}
                      checked={Array.isArray(config.targetCharts) && config.targetCharts.includes(chartItem.id)}
                      onCheckedChange={(checked) => {
                        const currentTargets = Array.isArray(config.targetCharts) ? config.targetCharts : []
                        if (checked) {
                          handleConfigChange("targetCharts", [...currentTargets, chartItem.id])
                        } else {
                          handleConfigChange(
                            "targetCharts",
                            currentTargets.filter((id) => id !== chartItem.id),
                          )
                        }
                      }}
                    />
                    <Label htmlFor={`chart-${chartItem.id}`} className="text-sm">
                      {chartItem.config?.title ||
                        `${chartItem.type
                          .split("-")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")} (${chartItem.id})`}
                    </Label>
                  </div>
                ))
              )}
            </ScrollArea>
          )}
        </div>
      </>
    )
  }

  const renderTextSettings = () => {
    return (
      <>
        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select
            value={config.fontFamily || "sans"}
            onValueChange={(value) => handleConfigChange("fontFamily", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans-serif</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
              <SelectItem value="cursive">Cursive</SelectItem>
              <SelectItem value="inter">Inter</SelectItem>
              <SelectItem value="georgia">Georgia</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
              <SelectItem value="courier">Courier New</SelectItem>
              <SelectItem value="helvetica">Helvetica</SelectItem>
              <SelectItem value="arial">Arial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Text Style</Label>
          <Select
            value={config.textStyle || "normal"}
            onValueChange={(value) => handleConfigChange("textStyle", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select text style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="heading">Heading</SelectItem>
              <SelectItem value="subheading">Subheading</SelectItem>
              <SelectItem value="caption">Caption</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="subtitle">Subtitle</SelectItem>
              <SelectItem value="quote">Quote</SelectItem>
              <SelectItem value="code">Code</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Font Size ({config.fontSize || 16}px)</Label>
          <Slider
            value={[config.fontSize || 16]}
            min={8}
            max={72}
            step={1}
            onValueChange={(value) => handleConfigChange("fontSize", value[0])}
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label>Line Height ({config.lineHeight || 1.5})</Label>
          <Slider
            value={[config.lineHeight || 1.5]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(value) => handleConfigChange("lineHeight", value[0])}
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label>Letter Spacing ({config.letterSpacing || 0}px)</Label>
          <Slider
            value={[config.letterSpacing || 0]}
            min={-2}
            max={10}
            step={0.5}
            onValueChange={(value) => handleConfigChange("letterSpacing", value[0])}
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label>Text Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={config.textColor || "#000000"}
              onChange={(e) => handleConfigChange("textColor", e.target.value)}
              className="w-12 h-8 p-1"
            />
            <Input
              type="text"
              value={config.textColor || "#000000"}
              onChange={(e) => handleConfigChange("textColor", e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Text Alignment</Label>
          <div className="flex items-center justify-between mt-2 gap-2">
            <Button
              type="button"
              variant={config.textAlign === "left" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("textAlign", "left")}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={config.textAlign === "center" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("textAlign", "center")}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={config.textAlign === "right" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("textAlign", "right")}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={config.textAlign === "justify" ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("textAlign", "justify")}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Text Formatting</Label>
          <div className="flex items-center justify-between mt-2 gap-2">
            <Button
              type="button"
              variant={config.bold ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("bold", !config.bold)}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={config.italic ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("italic", !config.italic)}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={config.underline ? "default" : "outline"}
              className="flex-1"
              onClick={() => handleConfigChange("underline", !config.underline)}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Text Transform</Label>
          <Select
            value={config.textTransform || "none"}
            onValueChange={(value) => handleConfigChange("textTransform", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select text transform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">UPPERCASE</SelectItem>
              <SelectItem value="lowercase">lowercase</SelectItem>
              <SelectItem value="capitalize">Capitalize</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Background Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={config.backgroundColor || "transparent"}
              onChange={(e) => handleConfigChange("backgroundColor", e.target.value)}
              className="w-12 h-8 p-1"
            />
            <Input
              type="text"
              value={config.backgroundColor || "transparent"}
              onChange={(e) => handleConfigChange("backgroundColor", e.target.value)}
              placeholder="transparent"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="px-2"
              onClick={() => handleConfigChange("backgroundColor", "transparent")}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="text-shadow">Text Shadow</Label>
            <Switch
              id="text-shadow"
              checked={config.textShadow || false}
              onCheckedChange={(checked) => handleConfigChange("textShadow", checked)}
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="text-overflow">Text Overflow Ellipsis</Label>
            <Switch
              id="text-overflow"
              checked={config.textOverflow || false}
              onCheckedChange={(checked) => handleConfigChange("textOverflow", checked)}
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="text-wrap">Text Wrap</Label>
            <Switch
              id="text-wrap"
              checked={config.textWrap !== false}
              onCheckedChange={(checked) => handleConfigChange("textWrap", checked)}
            />
          </div>
        </div>
      </>
    )
  }

  const renderImageSettings = () => {
    return (
      <>
        <div className="space-y-2">
          <Label>Image Fit</Label>
          <Select
            value={config.objectFit || "contain"}
            onValueChange={(value) => handleConfigChange("objectFit", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select image fit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Alt Text</Label>
          <Input
            value={config.alt || ""}
            onChange={(e) => handleConfigChange("alt", e.target.value)}
            placeholder="Image description for accessibility"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <Label htmlFor="image-border">Show Border</Label>
          <Switch
            id="image-border"
            checked={config.showBorder || false}
            onCheckedChange={(checked) => handleConfigChange("showBorder", checked)}
          />
        </div>
      </>
    )
  }

  const renderChartSettings = () => {
    const commonSettings = (
      <>
        <div className="space-y-2">
          <Label>Chart Title</Label>
          <Input
            value={config.title || ""}
            onChange={(e) => handleConfigChange("title", e.target.value)}
            placeholder="Chart title"
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label>Show Legend</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-legend"
              checked={config.showLegend !== false}
              onCheckedChange={(checked) => handleConfigChange("showLegend", checked)}
            />
            <Label htmlFor="show-legend">Display chart legend</Label>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Legend Position</Label>
          <Select
            value={config.legendPosition || "bottom"}
            onValueChange={(value) => handleConfigChange("legendPosition", value)}
            disabled={config.showLegend === false}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select legend position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="left">Left</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Show Grid Lines</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-grid"
              checked={config.showGrid !== false}
              onCheckedChange={(checked) => handleConfigChange("showGrid", checked)}
            />
            <Label htmlFor="show-grid">Display grid lines</Label>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Show Data Labels</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-labels"
              checked={config.showDataLabels || false}
              onCheckedChange={(checked) => handleConfigChange("showDataLabels", checked)}
            />
            <Label htmlFor="show-labels">Display data values on chart</Label>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Enable Animation</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="enable-animation"
              checked={config.enableAnimation !== false}
              onCheckedChange={(checked) => handleConfigChange("enableAnimation", checked)}
            />
            <Label htmlFor="enable-animation">Animate chart on load/update</Label>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Chart Style</Label>
          <Select
            value={config.chartStyle || "default"}
            onValueChange={(value) => handleConfigChange("chartStyle", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select chart style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="pastel">Pastel</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
              <SelectItem value="monochrome">Monochrome</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    )

    switch (item.type) {
      case "bar-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Bar Chart Type</Label>
              <Select
                value={config.barChartType || "vertical"}
                onValueChange={(value) => handleConfigChange("barChartType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bar chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="grouped">Grouped</SelectItem>
                  <SelectItem value="stacked">Stacked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Bar Radius ({config.barRadius || 0}px)</Label>
              <Slider
                value={[config.barRadius || 0]}
                min={0}
                max={20}
                step={1}
                onValueChange={(value) => handleConfigChange("barRadius", value[0])}
              />
            </div>
          </>
        )

      case "line-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Line Chart Type</Label>
              <Select
                value={config.lineChartType || "linear"}
                onValueChange={(value) => handleConfigChange("lineChartType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select line chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="curved">Curved</SelectItem>
                  <SelectItem value="step">Step</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Line Width ({config.lineWidth || 2}px)</Label>
              <Slider
                value={[config.lineWidth || 2]}
                min={1}
                max={10}
                step={0.5}
                onValueChange={(value) => handleConfigChange("lineWidth", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Show Dots</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-dots"
                  checked={config.showDots !== false}
                  onCheckedChange={(checked) => handleConfigChange("showDots", checked)}
                />
                <Label htmlFor="show-dots">Display data points</Label>
              </div>
            </div>
          </>
        )

      case "pie-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Pie Chart Type</Label>
              <Select
                value={config.pieChartType || "pie"}
                onValueChange={(value) => handleConfigChange("pieChartType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pie chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie</SelectItem>
                  <SelectItem value="donut">Donut</SelectItem>
                  <SelectItem value="donutActive">Interactive Donut</SelectItem>
                  <SelectItem value="donutWithText">Donut with Text</SelectItem>
                  <SelectItem value="semi">Semi-circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Inner Radius ({config.innerRadius || 60}%)</Label>
              <Slider
                value={[config.innerRadius || 60]}
                min={0}
                max={90}
                step={5}
                onValueChange={(value) => handleConfigChange("innerRadius", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Show Labels</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-labels"
                  checked={config.showLabels !== false}
                  onCheckedChange={(checked) => handleConfigChange("showLabels", checked)}
                />
                <Label htmlFor="show-labels">Display data labels</Label>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Show Percentages</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-percentages"
                  checked={config.showPercentages || false}
                  onCheckedChange={(checked) => handleConfigChange("showPercentages", checked)}
                />
                <Label htmlFor="show-percentages">Display percentages</Label>
              </div>
            </div>
          </>
        )

      case "area-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Area Chart Type</Label>
              <Select
                value={config.areaChartType || "default"}
                onValueChange={(value) => handleConfigChange("areaChartType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="stacked">Stacked</SelectItem>
                  <SelectItem value="percent">100% Stacked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Fill Opacity ({config.fillOpacity || 0.5})</Label>
              <Slider
                value={[config.fillOpacity || 0.5]}
                min={0.1}
                max={1}
                step={0.1}
                onValueChange={(value) => handleConfigChange("fillOpacity", value[0])}
              />
            </div>
          </>
        )

      case "scatter-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Dot Size ({config.dotSize || 5}px)</Label>
              <Slider
                value={[config.dotSize || 5]}
                min={1}
                max={20}
                step={1}
                onValueChange={(value) => handleConfigChange("dotSize", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Show Trendline</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-trendline"
                  checked={config.showTrendline || false}
                  onCheckedChange={(checked) => handleConfigChange("showTrendline", checked)}
                />
                <Label htmlFor="show-trendline">Display trendline</Label>
              </div>
            </div>
          </>
        )

      case "radar-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Fill Area</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="radar-fill"
                  checked={config.radarFill !== false}
                  onCheckedChange={(checked) => handleConfigChange("radarFill", checked)}
                />
                <Label htmlFor="radar-fill">Fill radar areas</Label>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Fill Opacity ({config.radarOpacity || 0.6})</Label>
              <Slider
                value={[config.radarOpacity || 0.6]}
                min={0.1}
                max={1}
                step={0.1}
                onValueChange={(value) => handleConfigChange("radarOpacity", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Grid Lines ({config.radarGridCount || 5})</Label>
              <Slider
                value={[config.radarGridCount || 5]}
                min={3}
                max={10}
                step={1}
                onValueChange={(value) => handleConfigChange("radarGridCount", value[0])}
              />
            </div>
          </>
        )

      case "radial-chart":
        return (
          <>
            {commonSettings}
            <div className="space-y-2 mt-4">
              <Label>Bar Size ({config.radialBarSize || 10}px)</Label>
              <Slider
                value={[config.radialBarSize || 10]}
                min={5}
                max={30}
                step={1}
                onValueChange={(value) => handleConfigChange("radialBarSize", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Start Angle ({config.radialStartAngle || 0}°)</Label>
              <Slider
                value={[config.radialStartAngle || 0]}
                min={0}
                max={360}
                step={15}
                onValueChange={(value) => handleConfigChange("radialStartAngle", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>End Angle ({config.radialEndAngle || 360}°)</Label>
              <Slider
                value={[config.radialEndAngle || 360]}
                min={0}
                max={360}
                step={15}
                onValueChange={(value) => handleConfigChange("radialEndAngle", value[0])}
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label>Show Background</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="radial-background"
                  checked={config.radialBarBackground !== false}
                  onCheckedChange={(checked) => handleConfigChange("radialBarBackground", checked)}
                />
                <Label htmlFor="radial-background">Display background</Label>
              </div>
            </div>
          </>
        )

      default:
        return commonSettings
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Type className="h-5 w-5" />
        Item Settings
      </h3>
      <Separator />
      {renderTypeSpecificSettings()}
    </div>
  )
}
