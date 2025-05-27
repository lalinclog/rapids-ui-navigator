"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DashboardSettingsProps {
  width: number
  height: number
  tabsPosition: "top" | "bottom"
  tabsSize: "small" | "default" | "large"
  onSizeChange: (width: number, height: number) => void
  onTabsPositionChange: (position: "top" | "bottom") => void
  onTabsSizeChange: (size: "small" | "default" | "large") => void
}

export default function DashboardSettings({
  width,
  height,
  tabsPosition,
  tabsSize,
  onSizeChange,
  onTabsPositionChange,
  onTabsSizeChange,
}: DashboardSettingsProps) {
  const [open, setOpen] = useState(false)
  const [newWidth, setNewWidth] = useState(width)
  const [newHeight, setNewHeight] = useState(height)

  const handleSave = () => {
    // Ensure minimum dimensions
    const finalWidth = Math.max(800, newWidth)
    const finalHeight = Math.max(600, newHeight)

    onSizeChange(finalWidth, finalHeight)
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4 mr-1" />
        Dashboard Settings
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dashboard Settings</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Tabs defaultValue="dimensions">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

              <TabsContent value="dimensions" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={newWidth}
                      onChange={(e) => setNewWidth(Number(e.target.value))}
                      min={800}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={newHeight}
                      onChange={(e) => setNewHeight(Number(e.target.value))}
                      min={600}
                    />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Set the dimensions of your dashboard canvas. Minimum dimensions are 800×600 pixels.
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tabsPosition">Tabs Position</Label>
                  <Select
                    id="tabsPosition"
                    value={tabsPosition}
                    onValueChange={(value) => onTabsPositionChange(value as "top" | "bottom")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tabsSize">Tabs Size</Label>
                  <Select
                    id="tabsSize"
                    value={tabsSize}
                    onValueChange={(value) => onTabsSizeChange(value as "small" | "default" | "large")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
