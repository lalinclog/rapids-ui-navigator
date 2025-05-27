"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ChartSettingsProps {
  config: any
  chartType: string
  onConfigChange: (config: any) => void
}

export function ChartSettings({ config, chartType, onConfigChange }: ChartSettingsProps) {
  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="axes">Axes</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="interactivity">Interactivity</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chartStyle">Chart Style</Label>
              <Select
                value={config.chartStyle || "default"}
                onValueChange={(value) => onConfigChange({ ...config, chartStyle: value })}
              >
                <SelectTrigger id="chartStyle">
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

            <div className="grid gap-2">
              <Label htmlFor="sortBy">Sort Data</Label>
              <Select
                value={config.sortBy || "none"}
                onValueChange={(value) => onConfigChange({ ...config, sortBy: value })}
              >
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="chrono">Chronological</SelectItem>
                  <SelectItem value="metric">By Metric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.sortBy === "metric" && (
              <div className="grid gap-2">
                <Label htmlFor="sortMetric">Sort Metric</Label>
                <Input
                  id="sortMetric"
                  value={config.sortMetric || ""}
                  onChange={(e) => onConfigChange({ ...config, sortMetric: e.target.value })}
                  placeholder="Enter metric field name"
                />
              </div>
            )}

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="showLegend"
                checked={config.showLegend !== false}
                onCheckedChange={(checked) => onConfigChange({ ...config, showLegend: checked })}
              />
              <Label htmlFor="showLegend">Show Legend</Label>
            </div>

            {config.showLegend !== false && (
              <div className="grid gap-2">
                <Label htmlFor="legendPosition">Legend Position</Label>
                <Select
                  value={config.legendPosition || "bottom"}
                  onValueChange={(value) => onConfigChange({ ...config, legendPosition: value })}
                >
                  <SelectTrigger id="legendPosition">
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
            )}

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="showDataLabels"
                checked={config.showDataLabels === true}
                onCheckedChange={(checked) => onConfigChange({ ...config, showDataLabels: checked })}
              />
              <Label htmlFor="showDataLabels">Show Data Labels</Label>
            </div>

            <Separator />

            {/* Chart-specific settings */}
            {chartType === "barChart" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="layout">Bar Layout</Label>
                  <Select
                    value={config.layout || "vertical"}
                    onValueChange={(value) => onConfigChange({ ...config, layout: value })}
                  >
                    <SelectTrigger id="layout">
                      <SelectValue placeholder="Select bar layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="grouped">Grouped</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="barWidth">Bar Width (%)</Label>
                  <Slider
                    id="barWidth"
                    defaultValue={[config.barWidth || 70]}
                    min={10}
                    max={100}
                    step={5}
                    onValueChange={(value) => onConfigChange({ ...config, barWidth: value[0] })}
                  />
                  <div className="text-right text-sm text-muted-foreground">{config.barWidth || 70}%</div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="barRadius">Bar Radius (px)</Label>
                  <Slider
                    id="barRadius"
                    defaultValue={[config.barRadius || 0]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={(value) => onConfigChange({ ...config, barRadius: value[0] })}
                  />
                  <div className="text-right text-sm text-muted-foreground">{config.barRadius || 0}px</div>
                </div>
              </>
            )}

            {chartType === "pieChart" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="donutSize">Donut Size (%)</Label>
                  <Slider
                    id="donutSize"
                    defaultValue={[config.donutSize || 0]}
                    min={0}
                    max={90}
                    step={5}
                    onValueChange={(value) => onConfigChange({ ...config, donutSize: value[0] })}
                  />
                  <div className="text-right text-sm text-muted-foreground">{config.donutSize || 0}%</div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="explodeSlices"
                    checked={config.explodeSlices === true}
                    onCheckedChange={(checked) => onConfigChange({ ...config, explodeSlices: checked })}
                  />
                  <Label htmlFor="explodeSlices">Explode Slices</Label>
                </div>

                {config.explodeSlices === true && (
                  <div className="grid gap-2">
                    <Label htmlFor="explodeOffset">Explode Offset</Label>
                    <Slider
                      id="explodeOffset"
                      defaultValue={[config.explodeOffset || 10]}
                      min={5}
                      max={30}
                      step={1}
                      onValueChange={(value) => onConfigChange({ ...config, explodeOffset: value[0] })}
                    />
                    <div className="text-right text-sm text-muted-foreground">{config.explodeOffset || 10}px</div>
                  </div>
                )}
              </>
            )}

            {chartType === "scatterChart" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="dotSize">Point Size</Label>
                  <Slider
                    id="dotSize"
                    defaultValue={[config.dotSize || 60]}
                    min={20}
                    max={100}
                    step={5}
                    onValueChange={(value) => onConfigChange({ ...config, dotSize: value[0] })}
                  />
                  <div className="text-right text-sm text-muted-foreground">{config.dotSize || 60}</div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pointShape">Point Shape</Label>
                  <Select
                    value={config.pointShape || "circle"}
                    onValueChange={(value) => onConfigChange({ ...config, pointShape: value })}
                  >
                    <SelectTrigger id="pointShape">
                      <SelectValue placeholder="Select point shape" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="triangle">Triangle</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                      <SelectItem value="star">Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="showTrendline"
                    checked={config.showTrendline === true}
                    onCheckedChange={(checked) => onConfigChange({ ...config, showTrendline: checked })}
                  />
                  <Label htmlFor="showTrendline">Show Trend Line</Label>
                </div>

                {config.showTrendline === true && (
                  <div className="grid gap-2">
                    <Label htmlFor="trendlineType">Trend Line Type</Label>
                    <Select
                      value={config.trendlineType || "linear"}
                      onValueChange={(value) => onConfigChange({ ...config, trendlineType: value })}
                    >
                      <SelectTrigger id="trendlineType">
                        <SelectValue placeholder="Select trend line type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="polynomial">Polynomial</SelectItem>
                        <SelectItem value="exponential">Exponential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="axes" className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">X-Axis Settings</h3>
              <div className="grid gap-2">
                <Label htmlFor="xAxisLabel">X-Axis Label</Label>
                <Input
                  id="xAxisLabel"
                  value={config.xAxis?.label || ""}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      xAxis: { ...(config.xAxis || {}), label: e.target.value },
                    })
                  }
                  placeholder="Enter x-axis label"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="xAxisUnit">X-Axis Unit</Label>
                <Input
                  id="xAxisUnit"
                  value={config.xAxis?.unit || ""}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      xAxis: { ...(config.xAxis || {}), unit: e.target.value },
                    })
                  }
                  placeholder="Enter x-axis unit (e.g., $, kg, %)"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="xAxisShowGrid"
                  checked={config.xAxis?.showGrid !== false}
                  onCheckedChange={(checked) =>
                    onConfigChange({
                      ...config,
                      xAxis: { ...(config.xAxis || {}), showGrid: checked },
                    })
                  }
                />
                <Label htmlFor="xAxisShowGrid">Show X-Axis Grid Lines</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Y-Axis Settings</h3>
              <div className="grid gap-2">
                <Label htmlFor="yAxisLabel">Y-Axis Label</Label>
                <Input
                  id="yAxisLabel"
                  value={config.yAxis?.label || ""}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      yAxis: { ...(config.yAxis || {}), label: e.target.value },
                    })
                  }
                  placeholder="Enter y-axis label"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="yAxisUnit">Y-Axis Unit</Label>
                <Input
                  id="yAxisUnit"
                  value={config.yAxis?.unit || ""}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      yAxis: { ...(config.yAxis || {}), unit: e.target.value },
                    })
                  }
                  placeholder="Enter y-axis unit (e.g., $, kg, %)"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="yAxisShowGrid"
                  checked={config.yAxis?.showGrid !== false}
                  onCheckedChange={(checked) =>
                    onConfigChange({
                      ...config,
                      yAxis: { ...(config.yAxis || {}), showGrid: checked },
                    })
                  }
                />
                <Label htmlFor="yAxisShowGrid">Show Y-Axis Grid Lines</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Padding</h3>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label htmlFor="paddingTop" className="text-xs">
                    Top
                  </Label>
                  <Input
                    id="paddingTop"
                    type="number"
                    min={0}
                    value={config.padding?.top || 5}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        padding: {
                          ...(config.padding || {}),
                          top: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="paddingRight" className="text-xs">
                    Right
                  </Label>
                  <Input
                    id="paddingRight"
                    type="number"
                    min={0}
                    value={config.padding?.right || 30}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        padding: {
                          ...(config.padding || {}),
                          right: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="paddingBottom" className="text-xs">
                    Bottom
                  </Label>
                  <Input
                    id="paddingBottom"
                    type="number"
                    min={0}
                    value={config.padding?.bottom || 5}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        padding: {
                          ...(config.padding || {}),
                          bottom: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="paddingLeft" className="text-xs">
                    Left
                  </Label>
                  <Input
                    id="paddingLeft"
                    type="number"
                    min={0}
                    value={config.padding?.left || 20}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        padding: {
                          ...(config.padding || {}),
                          left: Number.parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Colors</h3>
              <div className="grid gap-2">
                <Label>Custom Colors</Label>
                <div className="flex flex-wrap gap-2">
                  {(config.colors || ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"]).map((color, index) => (
                    <Input
                      key={index}
                      type="color"
                      value={color}
                      className="w-10 h-10 p-1 rounded-md cursor-pointer"
                      onChange={(e) => {
                        const newColors = [
                          ...(config.colors || ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"]),
                        ]
                        newColors[index] = e.target.value
                        onConfigChange({ ...config, colors: newColors })
                      }}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => {
                      const newColors = [
                        ...(config.colors || ["#4ade80", "#60a5fa", "#f97316", "#a78bfa", "#f43f5e"]),
                        "#000000",
                      ]
                      onConfigChange({ ...config, colors: newColors })
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interactivity" className="space-y-4 py-4">
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="enableZoom"
                checked={config.enableZoom === true}
                onCheckedChange={(checked) => onConfigChange({ ...config, enableZoom: checked })}
              />
              <Label htmlFor="enableZoom">Enable Zoom/Pan</Label>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="filterOnClick"
                checked={config.filterOnClick === true}
                onCheckedChange={(checked) => onConfigChange({ ...config, filterOnClick: checked })}
              />
              <Label htmlFor="filterOnClick">Filter on Click</Label>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="crossChartInteraction"
                checked={config.crossChartInteraction === true}
                onCheckedChange={(checked) => onConfigChange({ ...config, crossChartInteraction: checked })}
              />
              <Label htmlFor="crossChartInteraction">Cross-Chart Interaction</Label>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
