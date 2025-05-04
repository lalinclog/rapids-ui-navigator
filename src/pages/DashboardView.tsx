
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, LineChart, PieChart } from 'recharts';
import { AlertCircle, Calendar, Download, Share2 } from 'lucide-react';

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

const fetchDashboard = async (id: string): Promise<Dashboard> => {
  const response = await fetch(`/api/bi/dashboards/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.status}`);
  }
  return response.json();
};

const DashboardView: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => fetchDashboard(dashboardId || ''),
    enabled: !!dashboardId,
  });

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
        
        <div className="bg-muted/20 p-6 rounded-lg mb-6">
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load dashboard'}
          </AlertDescription>
        </Alert>
        <Button variant="default" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </AppLayout>
    );
  }

  // We would normally render the actual charts here
  // For now, we'll just show a placeholder representation
  return (
    <AppLayout>
      <Header
        title={dashboard.name}
        description={dashboard.description || ''}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="default" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        }
      />
      
      <div className="bg-muted/20 p-4 rounded-lg mb-6 flex items-center flex-wrap gap-4">
        <Button variant="outline" className="flex items-center">
          <Calendar className="mr-2 h-4 w-4" /> Last 7 Days
        </Button>
        {/* Render any global filters defined in the dashboard */}
        {dashboard.global_filters?.map((filter: any, index: number) => (
          <Button key={index} variant="outline">
            {filter.name}: {filter.defaultValue?.toString() || 'All'}
          </Button>
        ))}
      </div>
      
      {dashboard.items.length > 0 ? (
        <div 
          className="grid grid-cols-12 gap-4"
          style={{
            gridTemplateRows: `repeat(${Math.max(...dashboard.items.map(item => item.position_y + item.height))}, minmax(100px, auto))`
          }}
        >
          {dashboard.items.map((item) => (
            <Card
              key={item.id}
              className="p-4 overflow-hidden"
              style={{
                gridColumnStart: item.position_x + 1,
                gridColumnEnd: item.position_x + item.width + 1,
                gridRowStart: item.position_y + 1, 
                gridRowEnd: item.position_y + item.height + 1
              }}
            >
              <h3 className="font-medium mb-2">{item.chart_name}</h3>
              <div className="h-full w-full min-h-[120px] bg-muted/30 rounded flex items-center justify-center">
                {/* This would be replaced with actual chart components */}
                <div className="text-muted-foreground text-sm">
                  {item.chart_type.toUpperCase()} Chart Placeholder
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No charts in this dashboard</h3>
          <p className="text-muted-foreground mb-4">
            This dashboard doesn't have any charts yet.
          </p>
          <Button>Edit Dashboard</Button>
        </Card>
      )}
    </AppLayout>
  );
};

export default DashboardView;
