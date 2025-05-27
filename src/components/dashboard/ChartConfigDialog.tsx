
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ChartConfig } from '@/lib/types'

interface ChartConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chart_id?: number;
  chartType: string;
  config: ChartConfig;
  onDelete: () => void;
  onUpdate: (config: ChartConfig) => void;
}

const DEFAULT_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

const ChartConfigDialog: React.FC<ChartConfigDialogProps> = ({
  isOpen,
  onClose,
  chart_id,
  chartType,
  config,
  onDelete,
  onUpdate
}) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    colors: config?.colors || DEFAULT_COLORS,
    showGrid: config?.showGrid !== undefined ? config.showGrid : true,
    showLegend: config?.showLegend !== undefined ? config.showLegend : true,
    showTooltip: config?.showTooltip !== undefined ? config.showTooltip : true,
    title: config?.title || '',
  });

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...(chartConfig.colors || DEFAULT_COLORS)];
    newColors[index] = color;
    setChartConfig({ ...chartConfig, colors: newColors });
  };

  const handleBooleanChange = (key: keyof ChartConfig, value: boolean) => {
    setChartConfig({ ...chartConfig, [key]: value });
  };

  const handleSave = () => {
    onUpdate(chartConfig);
    toast({
      title: 'Chart updated',
      description: 'Chart configuration has been saved'
    });
    onClose();
  };

  const handleConfirmDelete = () => {
    if (confirm('Are you sure you want to delete this chart from the dashboard?')) {
      onDelete();
      toast({
        title: 'Chart removed',
        description: 'Chart has been removed from the dashboard'
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Chart</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Chart Title</Label>
                <Input 
                  id="title" 
                  value={chartConfig.title || ''} 
                  onChange={(e) => setChartConfig({...chartConfig, title: e.target.value})}
                  placeholder="Optional chart title"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Display Options</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={chartConfig.showGrid ? 'true' : 'false'}
                      onValueChange={(v) => handleBooleanChange('showGrid', v === 'true')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Grid" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Show Grid</SelectItem>
                        <SelectItem value="false">Hide Grid</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">Display chart grid lines</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={chartConfig.showLegend ? 'true' : 'false'}
                      onValueChange={(v) => handleBooleanChange('showLegend', v === 'true')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Legend" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Show Legend</SelectItem>
                        <SelectItem value="false">Hide Legend</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">Display chart legend</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={chartConfig.showTooltip ? 'true' : 'false'}
                      onValueChange={(v) => handleBooleanChange('showTooltip', v === 'true')}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Tooltip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Show Tooltip</SelectItem>
                        <SelectItem value="false">Hide Tooltip</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">Display tooltip on hover</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="colors" className="space-y-4 py-4">
            <div className="grid gap-4">
              <Label>Chart Colors</Label>
              <div className="grid grid-cols-2 gap-4">
                {(chartConfig.colors || DEFAULT_COLORS).slice(0, 5).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-md border"
                      style={{ backgroundColor: color }}
                    ></div>
                    <Input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleConfirmDelete}>
            Delete Chart
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChartConfigDialog;