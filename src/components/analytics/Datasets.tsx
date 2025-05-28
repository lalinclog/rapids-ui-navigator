
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Edit, Trash2, Play, FileText } from 'lucide-react';
import { Dataset } from '@/lib/types';
import DatasetForm from './DatasetForm';

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <CardDescription className="text-sm">
              {dataset.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant={getBadgeVariant(dataset.source_type)}>
              {dataset.source_type || 'Unknown'}
            </Badge>
            {dataset.source_name && (
              <Badge variant="outline" className="text-xs">
                {dataset.source_name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Query Type: </span>
            <span className="capitalize">{dataset.query_type}</span>
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Query: </span>
            <span className="text-muted-foreground font-mono text-xs truncate block">
              {dataset.query_definition}
            </span>
          </div>

          {dataset.fields && dataset.fields.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Fields: </span>
              <span className="text-muted-foreground">{dataset.fields.length} fields</span>
            </div>
          )}

          {dataset.last_refreshed_at && (
            <div className="text-xs text-muted-foreground">
              Last refreshed: {new Date(dataset.last_refreshed_at).toLocaleDateString()}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Updated: {new Date(dataset.updated_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onPreview}>
            <FileText className="h-4 w-4 mr-1" /> Preview
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
    // TODO: Implement dataset preview functionality
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
          <h2 className="text-xl font-semibold">Datasets</h2>
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Datasets</h2>
        <Button onClick={handleCreate}>
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
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Datasets</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first dataset by connecting to a data source and defining a query.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Dataset
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDataset ? 'Edit Dataset' : 'Create New Dataset'}</DialogTitle>
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
