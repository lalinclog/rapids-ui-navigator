
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Table, Eye, Trash2 } from 'lucide-react';
import DatasetForm from './DatasetForm';

interface Dataset {
  id: number;
  name: string;
  description: string | null;
  source_id: number;
  source_name: string;
  query_type: string;
  query_value: string;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string | null;
}

const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await fetch('/api/bi/datasets');
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
};

const DatasetCard: React.FC<{ dataset: Dataset; onEdit: () => void; onPreview: () => void; onDelete: () => void }> = ({ 
  dataset, onEdit, onPreview, onDelete 
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {dataset.description || "No description"}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {dataset.query_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm mb-2">
          <span className="font-medium text-muted-foreground">Source:</span>{' '}
          {dataset.source_name}
        </div>
        {dataset.last_refreshed_at && (
          <div className="text-xs text-muted-foreground">
            Last refreshed: {new Date(dataset.last_refreshed_at).toLocaleString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onPreview}>Preview</Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const Datasets: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: datasets, isLoading: isLoadingDatasets, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets
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

  const handlePreview = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsPreviewDialogOpen(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/bi/datasets/${dataset.id}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        throw new Error('Failed to preview dataset');
      }

      const result = await response.json();
      setPreviewData(result.data || []);
    } catch (error) {
      console.error('Error fetching preview data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to preview dataset',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (dataset: Dataset) => {
    if (confirm(`Are you sure you want to delete the dataset "${dataset.name}"?`)) {
      deleteDatasetMutation.mutate(dataset.id);
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingDataset(null);
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="py-8 text-center">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      );
    }

    if (!previewData.length) {
      return <div className="py-8 text-center text-muted-foreground">No data available</div>;
    }

    const columns = Object.keys(previewData[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {columns.map((column) => (
                <th key={column} className="p-2 text-left text-xs font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.slice(0, 100).map((row, index) => (
              <tr key={index} className="border-t border-muted">
                {columns.map((column) => (
                  <td key={column} className="p-2 text-xs">
                    {typeof row[column] === 'object' 
                      ? JSON.stringify(row[column]) 
                      : String(row[column] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoadingDatasets) {
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
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-28" />
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
              onPreview={() => handlePreview(dataset)}
              onDelete={() => handleDelete(dataset)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <Table className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Datasets</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first dataset to start building visualizations.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Dataset
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
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

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDataset?.name} Preview
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Datasets;
