
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Edit, Trash2, Play } from 'lucide-react';
import DataSourceForm from './DataSourceForm';

interface DataSource {
  id: number;
  name: string;
  type: string;
  connection_string: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  config?: Record<string, any>;
}

const fetchDataSources = async (): Promise<DataSource[]> => {
  const response = await fetch('/api/bi/data-sources');
  if (!response.ok) {
    throw new Error('Failed to fetch data sources');
  }
  return response.json();
};

const DataSourceCard: React.FC<{ 
  dataSource: DataSource; 
  onEdit: () => void; 
  onDelete: () => void;
  onTestConnection: () => void;
}> = ({ dataSource, onEdit, onDelete, onTestConnection }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataSource.name}</CardTitle>
            <CardDescription className="text-xs uppercase">
              {dataSource.type}
            </CardDescription>
          </div>
          <Badge variant={dataSource.is_active ? "default" : "outline"}>
            {dataSource.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-xs text-muted-foreground line-clamp-2">
          {dataSource.connection_string}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Last updated: {new Date(dataSource.updated_at).toLocaleDateString()}
        </div>
        {dataSource.config && Object.keys(dataSource.config).length > 0 && (
          <div className="mt-2 text-xs">
            <span className="font-medium text-muted-foreground">Additional settings: </span>
            {Object.keys(dataSource.config).length} settings
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onTestConnection}>
            <Play className="h-4 w-4 mr-1" /> Test
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const DataSources: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: dataSources, isLoading, error } = useQuery({
    queryKey: ['data-sources'],
    queryFn: fetchDataSources,
  });

  const deleteDataSourceMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      const response = await fetch(`/api/bi/data-sources/${dataSourceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources'] });
      toast({
        title: 'Data source deleted',
        description: 'Data source has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting data source',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (dataSourceId: number) => {
      setIsTestingConnection(true);
      const response = await fetch(`/api/bi/data-sources/${dataSourceId}/test-connection`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to test connection');
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Connection successful',
        description: data.message || 'Successfully connected to the data source',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect to the data source',
      });
    },
    onSettled: () => {
      setIsTestingConnection(false);
    }
  });

  const handleCreate = () => {
    setEditingDataSource(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (dataSource: DataSource) => {
    if (confirm(`Are you sure you want to delete the data source "${dataSource.name}"?`)) {
      deleteDataSourceMutation.mutate(dataSource.id);
    }
  };

  const handleTestConnection = (dataSource: DataSource) => {
    testConnectionMutation.mutate(dataSource.id);
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingDataSource(null);
    queryClient.invalidateQueries({ queryKey: ['data-sources'] });
  };

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
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
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
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Data Source
        </Button>
      </div>

      {dataSources && dataSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((dataSource) => (
            <DataSourceCard 
              key={dataSource.id} 
              dataSource={dataSource} 
              onEdit={() => handleEdit(dataSource)}
              onDelete={() => handleDelete(dataSource)}
              onTestConnection={() => handleTestConnection(dataSource)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Data Sources</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Connect to your first data source to start creating datasets and visualizations.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Data Source
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDataSource ? 'Edit Data Source' : 'Add New Data Source'}</DialogTitle>
          </DialogHeader>
          <DataSourceForm 
            dataSource={editingDataSource ?? undefined} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataSources;
