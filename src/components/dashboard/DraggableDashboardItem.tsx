
// src/components/dashboard/DraggableDashboardItem.tsx
import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Resizable } from 'react-resizable';
import { Bar, Line, Pie } from 'recharts';
import { BarChart, LineChart, PieChart } from 'recharts';
import { BarChart2, LineChart as LineIcon, PieChart as PieIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  chartData?: any[];
}

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

    switch (chartType.toLowerCase()) {
      case 'bar':
        return (
          <BarChart width={chartWidth} height={chartHeight} data={sampleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart width={chartWidth} height={chartHeight} data={sampleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart width={chartWidth} height={chartHeight}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" fill="#8884d8" label />
          </PieChart>
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
          maxConstraints={[512, 512]} // Increased max size
        >
          <div style={{ width: '100%', height: '100%' }}>
            {children}
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize" />
          </div>
        </Resizable>
      ) : (
        children
      )}
    </div>
  );
};

export default DraggableDashboardItem;
