// src/pages/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { BarChart2, LineChart, PieChart, Share2, Download, Calendar, Edit, Save, Plus, X, Eye, Type, Image, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DraggableDashboardItem from '@/components/dashboard/DraggableDashboardItem';

import { TextBlock } from '@/components/dashboard/TextBlock';
import { ImageBlock } from '@/components/dashboard/ImageBlock';
import { FilterControl } from '@/components/dashboard/FilterControl';
import ChartConfigDialog from '@/components/dashboard/ChartConfigDialog';
import { ChartConfig } from '@/lib/types'


// Type definitions
interface DashboardItem {
  id: number;
  type: 'chart' | 'text' | 'image' | 'filter';
  chart_id?: number;
  chart_name?: string;
  chart_type?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: ChartConfig;
  content?: string;
  style?: React.CSSProperties;
  url?: string;
  altText?: string;
  targetItemIds?: number[];
  availableFilters?: string[];
  filterOptions?: Record<string, any>;
}

interface Dashboard {
  id: number;
  name: string;
  description: string;
  layout: any;
  global_filters: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  is_public: boolean;
  items: DashboardItem[];
}

interface Chart {
  id: number;
  name: string;
  chart_type: string;
}

// Add these constants at the top of the file
const DASHBOARD_MAX_COLUMNS = 12;
const DASHBOARD_MAX_ROWS = 20;
const ITEM_MIN_WIDTH = 2;  // in grid units
const ITEM_MIN_HEIGHT = 2; // in grid units
const ITEM_MAX_WIDTH = 6;  // in grid units
const ITEM_MAX_HEIGHT = 6; // in grid units

const fetchDashboard = async (id: string): Promise<Dashboard> => {
  const response = await fetch(`/api/bi/dashboards/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch dashboard: ${response.status}`);
  return response.json();
};

const fetchAvailableCharts = async (): Promise<Chart[]> => {
  const response = await fetch('/api/bi/charts');
  if (!response.ok) throw new Error('Failed to fetch charts');
  return response.json();
};

const updateDashboardLayout = async (id: string, items: DashboardItem[]) => {
  console.log('Updating dashboard layout:', items);
  const response = await fetch(`/api/bi/dashboards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update dashboard: ${response.status} ${errorText}`);
  }
  return response.json();
};

const DashboardView: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [localItems, setLocalItems] = useState<DashboardItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);

  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showAddItemMenu, setShowAddItemMenu] = useState(false);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [selectedChartItem, setSelectedChartItem] = useState<DashboardItem | null>(null);

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => fetchDashboard(dashboardId || ''),
    enabled: !!dashboardId,
    });

  // Effect to initialize localItems when dashboard data is loaded
  useEffect(() => {
    if (dashboard) {
      // Convert layout to items if needed
      const items = dashboard.items || 
        (dashboard.layout ? dashboard.layout.map((item: any) => ({
          id: item.id,
          type: item.type || 'chart',
          chart_id: item.chart_id,
          chart_name: item.chart_name || `Chart ${item.chart_id}`,
          chart_type: item.chart_type || 'bar',
          position_x: item.x || item.position_x || 0,
          position_y: item.y || item.position_y || 0,
          width: item.width || 4,
          height: item.height || 3,
          config: item.config || {},
          content: item.content || '',
          style: item.style || {},
          url: item.url || '',
          altText: item.altText || '',
          targetItemIds: item.targetItemIds || [],
          availableFilters: item.availableFilters || [],
          filterOptions: item.filterOptions || {},
        })) : []);
      
      setLocalItems(items);
    }
  }, [dashboard]);

  const { data: availableCharts } = useQuery({
    queryKey: ['availableCharts'],
    queryFn: fetchAvailableCharts,
  });

  const updateMutation = useMutation({
    mutationFn: (items: DashboardItem[]) => updateDashboardLayout(dashboardId || '', items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast({
        title: 'Dashboard saved',
        description: 'Your changes have been saved successfully',
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error saving dashboard:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving dashboard',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(localItems);
  };

  const handleAddChart = (chart: Chart) => {
    // Find the maximum Y position to place the new item at the bottom
    const maxY = Math.max(...localItems.map(i => i.position_y + i.height), 0);

    const newItem: DashboardItem = {
      id: Date.now(),
      type: 'chart',
      chart_id: chart.id,
      chart_name: chart.name,
      chart_type: chart.chart_type,
      position_x: 0,
      position_y: maxY,
      width: 4,
      height: 3,
      config: {},
    };
    setLocalItems([...localItems, newItem]);
    setShowChartSelector(false);
    setActiveItemId(newItem.id);
  };

  const handleRemoveItem = (id: number) => {
    setLocalItems(localItems.filter(item => item.id !== id));
    if (activeItemId === id) {
      setActiveItemId(null);
    }
  };

  // Handle item position changes with collision prevention
  const handleMoveItem = (id: number, x: number, y: number) => {
    const movingItem = localItems.find(item => item.id === id);
    if (!movingItem) return;

    // Enforce dashboard boundaries
    const newX = Math.max(0, Math.min(x, DASHBOARD_MAX_COLUMNS - movingItem.width));
    const newY = Math.max(0, Math.min(y, DASHBOARD_MAX_ROWS - movingItem.height));

    // Check for collisions with other items
    const newPosition = { x: newX, y: newY, width: movingItem.width, height: movingItem.height };
    const collisions = localItems.filter(item => 
      item.id !== id &&
      newPosition.x < item.position_x + item.width &&
      newPosition.x + newPosition.width > item.position_x &&
      newPosition.y < item.position_y + item.height &&
      newPosition.y + newPosition.height > item.position_y
    );

    if (collisions.length === 0) {
      setLocalItems(localItems.map(item => 
        item.id === id ? { ...item, position_x: newX, position_y: newY } : item
      ));
    }
  };

  // Add these new handler functions
  const handleAddTextBlock = () => {
    const maxY = Math.max(...localItems.map(i => i.position_y + i.height), 0);

    const newItem: DashboardItem = {
      id: Date.now(),
      type: 'text',
      position_x: 0,
      position_y: maxY,
      width: 5,
      height: 4,
      config: {},
      content: 'Enter your text here...',
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'left',
        padding: '1rem' // Add padding
      }
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
    setActiveItemId(newItem.id);
  };

  const handleAddImageBlock = () => {
    const maxY = Math.max(...localItems.map(i => i.position_y + i.height), 0);
    
    const newItem: DashboardItem = {
      id: Date.now(),
      type: 'image',
      position_x: 0,
      position_y: maxY,
      width: 4,
      height: 4,
      config: {},
      url: '',
      altText: 'Image description'
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
    setActiveItemId(newItem.id);
  };

  const handleAddFilterItem = () => {
    const maxY = Math.max(...localItems.map(i => i.position_y + i.height), 0);
    
    const newItem: DashboardItem = {
      id: Date.now(),
      type: 'filter',
      position_x: 0,
      position_y: maxY,
      width: 4,
      height: 2,
      config: {},
      targetItemIds: [],
      availableFilters: ['Category', 'Date Range'],
      filterOptions: {}
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
    setActiveItemId(newItem.id);
  };

  const handleFilterChange = (filterId: number, filters: Record<string, any>) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: filters
    }));
    
    // Update the items that are affected by this filter
    const filterItem = localItems.find(item => item.id === filterId);
    if (filterItem && filterItem.targetItemIds) {
      // Logic to apply filters to target items would go here
      toast({
        title: "Filters Applied",
        description: `Applied filters to ${filterItem.targetItemIds.length} items`
      });
    }
  };

  const handleTextUpdate = (id: number, content: string, style?: React.CSSProperties) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, content, style: { ...item.style, ...style } } : item
    ));
  };

  const handleImageUpdate = (id: number, url: string, altText?: string) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, url, altText } : item
    ));
  };

  const handleFilterUpdate = (id: number, targetItemIds: number[], availableFilters: string[]) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, targetItemIds, availableFilters } : item
    ));
  };

  const handleResizeItem = (id: number, width: number, height: number) => {
    const newWidth = Math.max(ITEM_MIN_WIDTH, Math.min(width, ITEM_MAX_WIDTH));
    const newHeight = Math.max(ITEM_MIN_HEIGHT, Math.min(height, ITEM_MAX_HEIGHT));

    // Check for collisions
    const resizingItem = localItems.find(item => item.id === id);
    if (!resizingItem) return;
    
    // Check for collisions with new size
    const newSize = { x: resizingItem.position_x, y: resizingItem.position_y, width: newWidth, height: newHeight };
    const collisions = localItems.filter(item => 
      item.id !== id &&
      newSize.x < item.position_x + item.width &&
      newSize.x + newSize.width > item.position_x &&
      newSize.y < item.position_y + item.height &&
      newSize.y + newSize.height > item.position_y
    );
    
    if (collisions.length === 0) {
      // No collisions, update the size
      setLocalItems(localItems.map(item => 
        item.id === id ? { ...item, width: newWidth, height: newHeight } : item
      ));
    } else {
      toast({
        title: "Cannot resize",
        description: "Resizing would cause overlap with other items",
        variant: "destructive"
      });
    }
  };

  const handleChartClick = (item: DashboardItem) => {
    if (item.type === 'chart' && isEditing) {
      setSelectedChartItem(item);
      setShowChartConfig(true);
    }
  };

  const handleUpdateChartConfig = (id: number, config: any) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, config: { ...item.config, ...config } } : item
    ));
  };

  const renderItemContent = (item: DashboardItem) => {
    switch(item.type) {
      case 'text':
        return (
          <TextBlock
            content={item.content || ''}
            style={item.style}
            isEditing={isEditing}
            onUpdate={(content, style) => handleTextUpdate(item.id, content, style)}
          />
        );
      case 'image':
        return (
          <ImageBlock
            url={item.url || ''}
            altText={item.altText}
            isEditing={isEditing}
            onUpdate={(url, altText) => handleImageUpdate(item.id, url, altText)}
          />
        );
      case 'filter':
        return (
          <FilterControl
            targetItemIds={item.targetItemIds || []}
            availableFilters={item.availableFilters || []}
            filterOptions={item.filterOptions}
            currentFilters={activeFilters[item.id] || {}}
            isEditing={isEditing}
            onFilterChange={(filters) => handleFilterChange(item.id, filters)}
            onUpdate={(targetIds, filters) => handleFilterUpdate(item.id, targetIds, filters)}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={`col-span-${i === 0 ? '6' : '3'} row-span-${i === 0 ? '2' : '1'} p-4`}>
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-40 w-full" />
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboard) {
    return (
      <AppLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load dashboard'}
          </AlertDescription>
        </Alert>
        <Button variant="default" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </AppLayout>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <AppLayout>
        <Header
          title={dashboard?.name || 'Dashboard'}
          description={dashboard?.description || ''}
          action={
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowAddItemMenu(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    // Reset to original dashboard items
                    if (dashboard) setLocalItems(dashboard.items || []);
                    setIsEditing(false);
                  }}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                  <Button variant="default" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                </>
              )}
            </div>
          }
          />

          {/* Dialog for adding items */}
          <Dialog open={showAddItemMenu} onOpenChange={setShowAddItemMenu}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Item to Dashboard</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => setShowChartSelector(true)}>
                  <BarChart2 className="mr-2 h-4 w-4" /> Chart
                </Button>
                <Button variant="outline" onClick={handleAddTextBlock}>
                  <Type className="mr-2 h-4 w-4" /> Text
                </Button>
                <Button variant="outline" onClick={handleAddImageBlock}>
                  <Image className="mr-2 h-4 w-4" /> Image
                </Button>
                <Button variant="outline" onClick={handleAddFilterItem}>
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </div>
            </DialogContent>
            </Dialog>

            {/* Chart Configuration Dialog */}
            {selectedChartItem && (
              <ChartConfigDialog
                isOpen={showChartConfig}
                onClose={() => setShowChartConfig(false)}
                chart_id={selectedChartItem.chart_id}
                chartType={selectedChartItem.chart_type || 'bar'}
                config={selectedChartItem.config || {}}
                onDelete={() => {
                  handleRemoveItem(selectedChartItem.id);
                  setShowChartConfig(false);
                }}
                onUpdate={(config) => {
                  handleUpdateChartConfig(selectedChartItem.id, config);
                  setShowChartConfig(false);
                }}
              />
            )}

        <div className="bg-muted/20 p-4 rounded-lg mb-6 flex items-center flex-wrap gap-4">
          {dashboard?.global_filters?.map((filter, index) => (
            <Button key={index} variant="outline">
              {filter.name}: {filter.defaultValue?.toString() || 'All'}
            </Button>
          ))}
          {(!dashboard?.global_filters || dashboard?.global_filters.length === 0) && (
            <span className="text-sm text-muted-foreground">No filters applied</span>
          )}
        </div>

        {localItems.length > 0 ? (
          <div className="grid grid-cols-12 gap-4 auto-rows-min overflow-y-auto max-h-[calc(100vh-200px)]">
            {localItems.map((item) => (
              <DraggableDashboardItem
                key={item.id}
                id={item.id}
                x={item.position_x}
                y={item.position_y}
                width={item.width}
                height={item.height}
                onMove={handleMoveItem}
                onResize={handleResizeItem}
                onRemove={handleRemoveItem}
                isEditing={isEditing}
                chartType={item.chart_type}
                chart_id={item.chart_id}
                itemType={item.type}
                active={activeItemId === item.id}
                onActive={(id) => setActiveItemId(id)}
              >
                <Card className="h-full overflow-hidden">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">
                        {item.type === 'chart' ? item.chart_name : 
                          item.type === 'text' ? 'Text Block' :
                          item.type === 'image' ? 'Image Block' : 'Filter'}
                      </h3>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent 
                    className="p-3 pt-0 h-[calc(100%-40px)]"
                    onClick={() => item.type === 'chart' && handleChartClick(item)}
                    >
                    {item.type === 'chart' ? null : renderItemContent(item)}
                  </CardContent>
                </Card>
              </DraggableDashboardItem>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No items in this dashboard</h3>
            <p className="text-muted-foreground mb-4">
              {isEditing ? 'Add your first item to get started' : 'This dashboard is empty'}
            </p>
            {isEditing ? (
              <Button onClick={() => setShowAddItemMenu(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Dashboard
              </Button>
            )}
          </Card>
        )}

        <Dialog open={showChartSelector} onOpenChange={setShowChartSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Chart to Dashboard</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCharts?.map((chart) => (
                <Card
                  key={chart.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAddChart(chart)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {chart.chart_type === 'bar' && <BarChart2 className="h-4 w-4" />}
                    {chart.chart_type === 'line' && <LineChart className="h-4 w-4" />}
                    {chart.chart_type === 'pie' && <PieChart className="h-4 w-4" />}
                    <span className="font-medium">{chart.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {chart.chart_type} chart
                  </div>
                </Card>
              ))}
              {(!availableCharts || availableCharts.length === 0) && (
                <div className="col-span-3 p-8 text-center">
                  <p className="text-muted-foreground">No charts available. Create charts first.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </DndProvider>
  );
};

export default DashboardView;