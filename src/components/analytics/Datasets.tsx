import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FileText, Table, Code, Layers, Calendar, Cloud } from 'lucide-react';
import { Dataset } from '@/lib/types';
import DatasetForm from './DatasetForm';
import { DataSourceIcon } from './DataSourceIcons';

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
};

const getDataSourceIcon = (sourceType?: string) => {
  switch (sourceType?.toLowerCase()) {
    case 'postgresql':
    case 'postgres':
      return <Database className="h-4 w-4 text-blue-600" />;
    case 'mysql':
      return <Server className="h-4 w-4 text-orange-600" />;
    case 'minio':
      return <Cloud className="h-4 w-4 text-green-600" />;
    case 'sqlserver':
      return <HardDrive className="h-4 w-4 text-purple-600" />;
    case 'oracle':
      return <Zap className="h-4 w-4 text-red-600" />;
    default:
      return <Database className="h-4 w-4 text-gray-600" />;
  }
};

const getQueryTypeIcon = (queryType: string) => {
  switch (queryType?.toLowerCase()) {
    case 'table':
      return <Table className="h-4 w-4 text-blue-500" />;
    case 'view':
      return <Layers className="h-4 w-4 text-purple-500" />;
    case 'custom':
      return <Code className="h-4 w-4 text-orange-500" />;
    case 'bucket':
      return <Cloud className="h-4 w-4 text-green-500" />;
    default:
      return <Database className="h-4 w-4 text-gray-500" />;
  }
};

const DatasetCard: React.FC<{ 
  dataset: Dataset; 
  onEdit: () => void; 
  onDelete: () => void;
  onPreview: () => void;
}> = ({ dataset, onEdit, onDelete, onPreview }) => {
  const getBadgeVariant = (sourceType?: string) => {
    switch (sourceType?.toLowerCase()) {
      case 'postgresql':
      case 'postgres':
        return 'default';
      case 'minio':
        return 'secondary';
      case 'mysql':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 mb-2">
              <span className="truncate">{dataset.name}</span>
            </CardTitle>
            <CardDescription className="text-sm mb-3">
              {dataset.description || 'No description'}
            </CardDescription>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getBadgeVariant(dataset.source_type)} className="text-xs">
                <DataSourceIcon type={dataset.source_type || ''} className="h-3 w-3" />
                <span className="ml-1">{dataset.source_type || 'Unknown'}</span>
              </Badge>
              {dataset.source_name && (
                <Badge variant="outline" className="text-xs">
                  {dataset.source_name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {getQueryTypeIcon(dataset.query_type)}
            <span className="font-medium">Query Type:</span>
            <span className="capitalize text-muted-foreground">{dataset.query_type}</span>
          </div>
          
          <div className="text-sm">
            <span className="font-medium mb-1 block">Query:</span>
            <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground font-mono break-all max-h-16 overflow-y-auto">
              {dataset.query_definition}
            </div>
          </div>

          {dataset.fields && dataset.fields.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Fields:</span>
              <span className="text-muted-foreground">{dataset.fields.length} fields</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Updated: {new Date(dataset.updated_at).toLocaleDateString()}</span>
            </div>
            {dataset.last_refreshed_at && (
              <span>Refreshed: {new Date(dataset.last_refreshed_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 flex justify-between border-t">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 mr-2">
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onPreview} className="px-2">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="px-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const Datasets: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

  const { data: datasets, isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  });

  const deleteDatasetMutation = useMutation({
    mutationFn: async (datasetId: number) => {
      const response = await fetch(`/api/bi/datasets/${datasetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({
        title: 'Dataset deleted',
        description: 'Dataset has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting dataset',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleCreate = () => {
    setEditingDataset(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (dataset: Dataset) => {
    setEditingDataset(dataset);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (dataset: Dataset) => {
    if (confirm(`Are you sure you want to delete the dataset "${dataset.name}"?`)) {
      deleteDatasetMutation.mutate(dataset.id);
    }
  };

  const handlePreview = (dataset: Dataset) => {
    toast({
      title: 'Preview',
      description: `Preview functionality for ${dataset.name} will be implemented soon`,
    });
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingDataset(null);
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Datasets</h2>
            <p className="text-muted-foreground">Create and manage your data queries</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Add Dataset
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
        Error loading datasets: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Datasets
          </h2>
          <p className="text-muted-foreground">Create and manage your data queries</p>
        </div>
        <Button onClick={handleCreate} size="lg">
          <Plus className="mr-2 h-4 w-4" /> Add Dataset
        </Button>
      </div>

      {datasets && datasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset) => (
            <DatasetCard 
              key={dataset.id} 
              dataset={dataset} 
              onEdit={() => handleEdit(dataset)}
              onDelete={() => handleDelete(dataset)}
              onPreview={() => handlePreview(dataset)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-6">
            <Layers className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Datasets</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first dataset by connecting to a data source and defining a query. Datasets can be tables, views, or custom SQL queries.
          </p>
          <Button onClick={handleCreate} size="lg">
            <Plus className="mr-2 h-4 w-4" /> Create Your First Dataset
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingDataset ? 'Edit Dataset' : 'Create New Dataset'}
            </DialogTitle>
          </DialogHeader>
          <DatasetForm 
            dataset={editingDataset ?? undefined} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Datasets;
