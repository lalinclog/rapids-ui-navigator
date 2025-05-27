"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Settings2 } from "lucide-react"

interface AdvancedChartSettingsProps {
  config: any
  onConfigChange: (config: any) => void
  chartType: string
}

export default function AdvancedChartSettings({ config, onConfigChange, chartType }: AdvancedChartSettingsProps) {
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    setOpen(false)
  }

  // Render settings specific to chart type
  const renderChartSpecificSettings = () => {
    switch (chartType) {
      case "barChart":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="barGap">Bar Gap</Label>
              <Slider
                id="barGap"
                defaultValue={[config.barGap || 4]}
                min={0}
                max={20}
                step={1}
                onValueChange={(value) => onConfigChange({ ...config, barGap: value[0] })}
                className="py-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barCategoryGap">Category Gap</Label>
              <Slider
                id="barCategoryGap"
                defaultValue={[config.barCategoryGap || 10]}
                min={0}
                max={50}
                step={1}
                onValueChange={(value) => onConfigChange({ ...config, barCategoryGap: value[0] })}
                className="py-4"
              />
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="barAnimationActive"
                checked={config.barAnimationActive !== false}
                onCheckedChange={(checked) => onConfigChange({ ...config, barAnimationActive: checked })}
              />
              <Label htmlFor="barAnimationActive">Enable Animation</Label>
            </div>
          </div>
        )

      case "lineChart":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="connectNulls">Connect Null Values</Label>
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="connectNulls"
                  checked={config.connectNulls === true}
                  onCheckedChange={(checked) => onConfigChange({ ...config, connectNulls: checked })}
                />
                <Label htmlFor="connectNulls">Connect across null data points</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activeDotSize">Active Dot Size</Label>
              <Slider
                id="activeDotSize"
                defaultValue={[config.activeDotSize || 8]}
                min={4}
                max={12}
                step={1}
                onValueChange={(value) => onConfigChange({ ...config, activeDotSize: value[0] })}
                className="py-4"
              />
            </div>
          </div>
        )

      case "pieChart":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="paddingAngle">Padding Angle</Label>
              <Slider
                id="paddingAngle"
                defaultValue={[config.paddingAngle || 0]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(value) => onConfigChange({ ...config, paddingAngle: value[0] })}
                className="py-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="labelOffset">Label Offset</Label>
              <Slider
                id="labelOffset"
                defaultValue={[config.labelOffset || 0]}
                min={-20}
                max={20}
                step={1}
                onValueChange={(value) => onConfigChange({ ...config, labelOffset: value[0] })}
                className="py-4"
              />
            </div>
          </div>
        )

      case "areaChart":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="baseValue">Base Value</Label>
              <Input
                id="baseValue"
                type="number"
                value={config.baseValue || 0}
                onChange={(e) => onConfigChange({ ...config, baseValue: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">The base value of area chart, default is 0.</p>
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="isRangeArea"
                checked={config.isRangeArea === true}
                onCheckedChange={(checked) => onConfigChange({ ...config, isRangeArea: checked })}
              />
              <Label htmlFor="isRangeArea">Range Area</Label>
            </div>
          </div>
        )

      case "scatterChart":
        return (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="zAxisKey">Z-Axis Data Key (for bubble size)</Label>
              <Input
                id="zAxisKey"
                value={config.zAxisKey || ""}
                onChange={(e) => onConfigChange({ ...config, zAxisKey: e.target.value })}
                placeholder="Optional: data key for point size"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jitterRange">Jitter Range</Label>
              <Slider
                id="jitterRange"
                defaultValue={[config.jitterRange || 0]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(value) => onConfigChange({ ...config, jitterRange: value[0] })}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">Add random jitter to prevent overlapping points.</p>
            </div>
          </div>
        )

      default:
        return <div>No advanced settings available for this chart type.</div>
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="mt-4">
        <Settings2 className="h-4 w-4 mr-1" />
        Advanced Chart Settings
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Advanced Chart Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="chartSpecific">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chartSpecific">Chart Specific</TabsTrigger>
              <TabsTrigger value="animation">Animation</TabsTrigger>
              <TabsTrigger value="reference">Reference Lines</TabsTrigger>
            </TabsList>

            <TabsContent value="chartSpecific" className="space-y-4 py-4">
              {renderChartSpecificSettings()}
            </TabsContent>

            <TabsContent value="animation" className="space-y-4 py-4">
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="animationEnabled"
                  checked={config.animationEnabled !== false}
                  onCheckedChange={(checked) => onConfigChange({ ...config, animationEnabled: checked })}
                />
                <Label htmlFor="animationEnabled">Enable Animation</Label>
              </div>

              {config.animationEnabled !== false && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="animationDuration">Animation Duration (ms)</Label>
                    <Input
                      id="animationDuration"
                      type="number"
                      value={config.animationDuration || 1000}
                      onChange={(e) => onConfigChange({ ...config, animationDuration: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="animationEasing">Animation Easing</Label>
                    <Select
                      value={config.animationEasing || "ease"}
                      onValueChange={(value) => onConfigChange({ ...config, animationEasing: value })}
                    >
                      <SelectTrigger id="animationEasing">
                        <SelectValue placeholder="Select easing function" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ease">Ease</SelectItem>
                        <SelectItem value="ease-in">Ease In</SelectItem>
                        <SelectItem value="ease-out">Ease Out</SelectItem>
                        <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                        <SelectItem value="linear">Linear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="reference" className="space-y-4 py-4">
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="showReferenceLine"
                  checked={config.showReferenceLine === true}
                  onCheckedChange={(checked) => onConfigChange({ ...config, showReferenceLine: checked })}
                />
                <Label htmlFor="showReferenceLine">Show Reference Line</Label>
              </div>

              {config.showReferenceLine === true && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="referenceLineValue">Reference Line Value</Label>
                    <Input
                      id="referenceLineValue"
                      type="number"
                      value={config.referenceLineValue || 0}
                      onChange={(e) => onConfigChange({ ...config, referenceLineValue: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceLineLabel">Reference Line Label</Label>
                    <Input
                      id="referenceLineLabel"
                      value={config.referenceLineLabel || ""}
                      onChange={(e) => onConfigChange({ ...config, referenceLineLabel: e.target.value })}
                      placeholder="Target, Average, etc."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceLineColor">Reference Line Color</Label>
                    <Select
                      value={config.referenceLineColor || "red"}
                      onValueChange={(value) => onConfigChange({ ...config, referenceLineColor: value })}
                    >
                      <SelectTrigger id="referenceLineColor">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referenceLineStroke">Reference Line Style</Label>
                    <Select
                      value={config.referenceLineStroke || "dashed"}
                      onValueChange={(value) => onConfigChange({ ...config, referenceLineStroke: value })}
                    >
                      <SelectTrigger id="referenceLineStroke">
                        <SelectValue placeholder="Select line style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Apply Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
