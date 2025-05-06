
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import DataSources from '@/components/analytics/DataSources';
import Datasets from '@/components/analytics/Datasets';
import Charts from '@/components/analytics/Charts';
import Dashboards from '@/components/analytics/Dashboards';

// Define supported chart types to maintain consistency across the application
export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  AREA: 'area',
  TABLE: 'table',
};

const Analytics = () => {
  return (
    <AppLayout>
      <Header 
        title="Analytics & BI" 
        description="Connect to data sources, create datasets, build charts, and assemble dashboards"
      />
      
      <Tabs defaultValue="dashboards" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sources">
          <Card className="p-6">
            <DataSources />
          </Card>
        </TabsContent>
        
        <TabsContent value="datasets">
          <Card className="p-6">
            <Datasets />
          </Card>
        </TabsContent>
        
        <TabsContent value="charts">
          <Card className="p-6">
            <Charts />
          </Card>
        </TabsContent>
        
        <TabsContent value="dashboards">
          <Card className="p-6">
            <Dashboards />
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Analytics;
