
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
import { BarChart2, LineChart, PieChart, Share2, Download, Calendar, Edit, Save, Plus, X, Eye, Type, Image, Filter  } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DraggableDashboardItem from '@/components/dashboard/DraggableDashboardItem';

import TextBlock from '@/components/dashboard/TextBlock'
import ImageBlock from '@/components/dashboard/ImageBlock'


interface DashboardItem {
  id: number;
  chart_id: number;
  chart_name: string;
  chart_type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: any;
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

// Add this function to handle image uploads
const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/bi/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload image');
  return response.json();
};

const fetchChartData = async (chartId: number): Promise<any[]> => {
    const response = await fetch(`/api/bi/charts/${chartId}/data`);
    if (!response.ok) {
      console.error(`Failed to fetch data for chart ${chartId}: ${response.status}`);
      return [];
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

  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showAddItemMenu, setShowAddItemMenu] = useState(false);

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
          chart_id: item.chart_id,
          chart_name: item.chart_name || `Chart ${item.chart_id}`,
          chart_type: item.chart_type || 'bar',
          position_x: item.x || item.position_x || 0,
          position_y: item.y || item.position_y || 0,
          width: item.width || 4,
          height: item.height || 3,
          config: item.config || {},
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
    const newItem: DashboardItem = {
      id: Date.now(),
      chart_id: chart.id,
      chart_name: chart.name,
      chart_type: chart.chart_type,
      position_x: 0,
      position_y: Math.max(...localItems.map(i => i.position_y + i.height), 0),
      width: 4,
      height: 3,
      config: {},
    };
    setLocalItems([...localItems, newItem]);
    setShowChartSelector(false);
  };

  const handleRemoveItem = (id: number) => {
    setLocalItems(localItems.filter(item => item.id !== id));
  };

  const handleMoveItem = (id: number, x: number, y: number) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, position_x: x, position_y: y } : item
    ));
  };

  // Add these new handler functions
  const handleAddTextBlock= () => {
    const newItem: TextBlock = {
      id: Date.now(),
      type: 'text',
      position_x: 0,
      position_y: Math.max(...localItems.map(i => i.position_y + i.height), 0),
      width: 4,
      height: 2,
      config: {},
      content: 'Enter your text here...',
      style: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#000000',
        textAlign: 'left'
      }
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
  };

  const handleAddImageBlock = () => {
    const newItem: ImageItem = {
      id: Date.now(),
      type: 'image',
      position_x: 0,
      position_y: Math.max(...localItems.map(i => i.position_y + i.height), 0),
      width: 4,
      height: 4,
      config: {},
      url: '',
      altText: 'Image description'
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
  };

  const handleAddFilterItem = () => {
    const newItem: FilterItem = {
      id: Date.now(),
      type: 'filter',
      position_x: 0,
      position_y: Math.max(...localItems.map(i => i.position_y + i.height), 0),
      width: 4,
      height: 2,
      config: {},
      targetItemIds: [],
      filterType: 'select',
      options: [],
      currentValue: null
    };
    setLocalItems([...localItems, newItem]);
    setShowAddItemMenu(false);
  };

  const handleFilterChange = (filterId: number, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  const handleResizeItem = (id: number, width: number, height: number) => {
    setLocalItems(localItems.map(item => 
      item.id === id ? { ...item, width, height } : item
    ));
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
                  <Button variant="outline" size="sm" onClick={() => setShowChartSelector(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Chart
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

          // Add this new Dialog for adding items
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
        />

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
          <div className="grid grid-cols-12 gap-4 auto-rows-min">
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
                chartId={item.chart_id}
              >
                <Card className="h-full p-4 overflow-hidden">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{item.chart_name}</h3>
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
                  <CardContent className="p-3 pt-0 h-[calc(100%-40px)]">
                    <div className="h-full w-full min-h-[120px] rounded flex items-center justify-center">
                      {item.chart_type === 'bar' && (
                        <BarChart2 className="h-8 w-8 text-muted-foreground opacity-0" />
                      )}
                      {item.chart_type === 'line' && (
                        <LineChart className="h-8 w-8 text-muted-foreground opacity-0" />
                      )}
                      {item.chart_type === 'pie' && (
                        <PieChart className="h-8 w-8 text-muted-foreground opacity-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </DraggableDashboardItem>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No charts in this dashboard</h3>
            <p className="text-muted-foreground mb-4">
              {isEditing ? 'Add your first chart to get started' : 'This dashboard is empty'}
            </p>
            {isEditing ? (
              <Button onClick={() => setShowChartSelector(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Chart
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
