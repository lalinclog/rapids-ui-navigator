
import React, { useEffect, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Resizable } from 'react-resizable';
import { BarChart, LineChart, PieChart } from 'recharts';
import { Bar, Line, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import 'react-resizable/css/styles.css';

interface DraggableDashboardItemProps {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
  onMove: (id: number, x: number, y: number) => void;
  onResize: (id: number, width: number, height: number) => void;
  onRemove: (id: number) => void;
  isEditing: boolean;
  chartType?: string;
  chartId?: number;
}

// Fallback sample data for when API requests fail
const sampleData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 200 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 350 },
];

const pieData = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

const fetchChartData = async (chartId: number): Promise<any[]> => {
  if (!chartId) return [];
  
  try {
    const response = await fetch(`/api/bi/charts/${chartId}/data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for chart ${chartId}: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

const DraggableDashboardItem: React.FC<DraggableDashboardItemProps> = ({
  id,
  x,
  y,
  width,
  height,
  children,
  onMove,
  onResize,
  onRemove,
  isEditing,
  chartType,
  chartId,
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'DASHBOARD_ITEM',
    item: { id, x, y },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: 'DASHBOARD_ITEM',
    drop: (item: { id: number; x: number; y: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newX = Math.max(0, x + Math.round(delta.x / 32));
        const newY = Math.max(0, y + Math.round(delta.y / 32));
        onMove(item.id, newX, newY);
      }
    },
  }));

  const handleResize = (e: any, { size }: { size: { width: number; height: number } }) => {
    onResize(id, Math.max(2, Math.round(size.width / 32)), Math.max(2, Math.round(size.height / 32)));
  };

  // Fetch real chart data from the API if a chartId is provided
  const { data: chartData, isLoading: isLoadingData, error } = useQuery({
    queryKey: ['chartData', chartId],
    queryFn: () => fetchChartData(chartId || 0),
    enabled: !!chartId,
    onError: (err) => {
      console.error('Failed to load chart data:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load chart data',
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    }
  });

  // Format the data for rendering based on the structure
  const formattedData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return chartType?.toLowerCase() === 'pie' ? pieData : sampleData;
    }

    // Transform API data if needed
    // Here we'd adapt the data to the format required by recharts
    const hasNameProperty = chartData.some(item => 'name' in item);
    const hasValueProperty = chartData.some(item => 'value' in item);
    
    if (hasNameProperty && hasValueProperty) {
      return chartData; // Data already in the correct format
    }
    
    // If data isn't in the expected format, try to adapt it
    const keys = Object.keys(chartData[0] || {});
    if (keys.length >= 2) {
      // Use first column as name and second as value
      const nameKey = keys[0];
      const valueKey = keys[1];
      
      return chartData.map(item => ({
        name: String(item[nameKey]),
        value: Number(item[valueKey])
      }));
    }
    
    return chartType?.toLowerCase() === 'pie' ? pieData : sampleData;
  }, [chartData, chartType]);

  const renderChart = () => {
    const chartWidth = width * 32 - 32; // Adjust for padding
    const chartHeight = height * 32 - 60; // Adjust for header and padding
    
    if (!chartType || chartHeight < 50) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <span className="text-muted-foreground text-sm">No chart data</span>
        </div>
      );
    }

    if (isLoadingData) {
      return <Skeleton className="h-full w-full" />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4">
          <span className="text-destructive text-sm">Error loading chart data</span>
          <span className="text-muted-foreground text-xs mt-1">Using sample data</span>
        </div>
      );
    }

    switch (chartType.toLowerCase()) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie 
                data={formattedData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                fill="#8884d8" 
                label 
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="h-full w-full flex items-center justify-center">
            {chartType === 'bar' && <BarChart2 className="h-8 w-8 text-muted-foreground" />}
            {chartType === 'line' && <LineIcon className="h-8 w-8 text-muted-foreground" />}
            {chartType === 'pie' && <PieIcon className="h-8 w-8 text-muted-foreground" />}
          </div>
        );
    }
  };

  return (
    <div
      ref={(node) => drag(drop(node))}
      className="relative"
      style={{
        gridColumnStart: x + 1,
        gridColumnEnd: x + width + 1,
        gridRowStart: y + 1,
        gridRowEnd: y + height + 1,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
      }}
    >
      {isEditing ? (
        <Resizable
          width={width * 32}
          height={height * 32}
          onResize={handleResize}
          resizeHandles={['se']}
          minConstraints={[64, 64]}
          maxConstraints={[512, 512]}
        >
          <div style={{ width: '100%', height: '100%' }}>
            {React.cloneElement(children as React.ReactElement, {}, renderChart())}
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />
          </div>
        </Resizable>
      ) : (
        React.cloneElement(children as React.ReactElement, {}, renderChart())
      )}
    </div>
  );
};

export default DraggableDashboardItem;
