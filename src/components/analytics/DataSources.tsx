
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Plus } from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

const DataSourceCard: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataSource.name}</CardTitle>
            <CardDescription>
              {dataSource.type.toUpperCase()}
            </CardDescription>
          </div>
          <Badge variant={dataSource.is_active ? "default" : "outline"}>
            {dataSource.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-muted-foreground mb-2">
          <span className="font-medium">Connection:</span>
          <div className="truncate mt-1 max-w-full">
            {dataSource.connection_string || "No connection string"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(dataSource.updated_at).toLocaleDateString()}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm">Edit</Button>
        <Button variant="ghost" size="sm">Test Connection</Button>
      </CardFooter>
    </Card>
  );
};

const DataSources: React.FC = () => {
  const { data: dataSources, isLoading, error } = useQuery({
    queryKey: ['dataSources'],
    queryFn: fetchDataSources,
  });

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Data Sources</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Data Source
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-32" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        Error loading data sources: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Data Sources</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Data Source
        </Button>
      </div>
      
      {dataSources && dataSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((source) => (
            <DataSourceCard key={source.id} dataSource={source} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Data Sources</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Connect to your first data source to start building analytics.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Data Source
          </Button>
        </div>
      )}
    </div>
  );
};

export default DataSources;
