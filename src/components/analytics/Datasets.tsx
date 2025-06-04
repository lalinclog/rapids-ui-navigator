import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Edit, Trash2, Play, FileText } from 'lucide-react';
import DatasetForm from './DatasetForm';
import authService from '@/services/AuthService';

// Define the Dataset interface locally to match the backend
interface Dataset {
  id: number;
  name: string;
  description: string;
  table_name: string;
  namespace: string;
  schema_info: Record<string, any>;
  created_at: string;
  updated_at: string;
  row_count?: number;
  file_size?: number;
  last_updated?: string;
  source_id: number;
  query_type: string;
  query_definition: any;
}

const fetchDatasets = async (): Promise<Dataset[]> => {
  const token = await authService.getValidToken();
  const response = await fetch('/api/bi/datasets', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
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
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{dataset.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {dataset.description}
              </CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {dataset.namespace}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {dataset.table_name}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {dataset.row_count && (
              <div>
                <span className="text-muted-foreground">Rows:</span>
                <div className="font-medium">{dataset.row_count.toLocaleString()}</div>
              </div>
            )}
            {dataset.file_size && (
              <div>
                <span className="text-muted-foreground">Size:</span>
                <div className="font-medium">{(dataset.file_size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            <div>Created: {new Date(dataset.created_at).toLocaleDateString()}</div>
            {dataset.last_updated && (
              <div>Updated: {new Date(dataset.last_updated).toLocaleDateString()}</div>
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
      const token = await authService.getValidToken();
      const response = await fetch(`/api/bi/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      title: 'Preview coming soon',
      description: 'Dataset preview functionality will be available soon',
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
            <p className="text-muted-foreground">Manage your Iceberg datasets</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Dataset
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
            <Database className="h-6 w-6" />
            Datasets
          </h2>
          <p className="text-muted-foreground">Create and manage your Iceberg datasets</p>
        </div>
        <Button onClick={handleCreate} size="lg">
          <Plus className="mr-2 h-4 w-4" /> Create Dataset
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
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Datasets</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first Iceberg dataset to start analyzing your data. Connect to data sources and transform your data into queryable tables.
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
