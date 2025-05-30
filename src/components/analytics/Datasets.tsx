
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import DatasetForm from './DatasetForm';
import { DataSourceIcon } from './DataSourceIcons';

interface Dataset {
  id: number;
  name: string;
  description?: string;
  source_id: number;
  source_name?: string;
  source_type?: string;
  query_type: "table" | "view" | "custom" | "bucket";
  query_definition: string;
  query_value?: string;
  schema?: any;
  column_types?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

const Datasets: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

  const queryClient = useQueryClient();

  const { data, isError, error, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      setIsLoading(true);
      const response = await fetch('/api/bi/datasets');
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      const data = await response.json();
      // Map query_definition to query_value for backward compatibility
      const mappedData = data.map((dataset: any) => ({
        ...dataset,
        query_value: dataset.query_definition
      }));
      setDatasets(mappedData);
      setIsLoading(false);
      return mappedData;
    },
  });

  useEffect(() => {
    refetch();
  }, []);

  const createDatasetMutation = useMutation({
    mutationFn: async (newDataset: Omit<Dataset, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch('/api/bi/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDataset),
      });
      if (!response.ok) {
        throw new Error('Failed to create dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({
        title: "Dataset created",
        description: "Successfully created dataset",
      });
      setIsCreateDialogOpen(false);
      setEditingDataset(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create dataset",
      });
    },
  });

  const updateDatasetMutation = useMutation({
    mutationFn: async (updatedDataset: Dataset) => {
      const response = await fetch(`/api/bi/datasets/${updatedDataset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDataset),
      });
      if (!response.ok) {
        throw new Error('Failed to update dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({
        title: "Dataset updated",
        description: "Successfully updated dataset",
      });
      setIsCreateDialogOpen(false);
      setEditingDataset(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update dataset",
      });
    },
  });

  const deleteDatasetMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/bi/datasets/${id}`, {
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
        title: "Dataset deleted",
        description: "Successfully deleted dataset",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete dataset",
      });
    },
  });

  const handleCreateDialogOpen = () => {
    setEditingDataset(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (dataset: Dataset) => {
    // Ensure all required properties are present for the form
    const editDataset = {
      ...dataset,
      query_type: dataset.query_type || 'table' as const,
      query_definition: dataset.query_definition || '',
      query_value: dataset.query_value || dataset.query_definition || '', // Use query_value or fallback to query_definition
    };
    setEditingDataset(editDataset);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteDatasetMutation.mutate(id);
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingDataset(null);
  };

  const handleSubmit = async (datasetData: Omit<Dataset, 'id' | 'created_at' | 'updated_at'>) => {
    // Ensure query_value is always present
    const datasetPayload = {
      ...datasetData,
      query_value: datasetData.query_value || datasetData.query_definition || ''
    };

    if (editingDataset) {
      updateDatasetMutation.mutate({ 
        ...editingDataset, 
        ...datasetPayload,
        created_at: editingDataset.created_at,
        updated_at: editingDataset.updated_at
      });
    } else {
      createDatasetMutation.mutate(datasetPayload);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading datasets...
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500">Error: {error?.message}</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Datasets</CardTitle>
        <Button onClick={handleCreateDialogOpen}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dataset
        </Button>
      </CardHeader>
      <CardContent>
        {datasets.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Query Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell>{dataset.name}</TableCell>
                    <TableCell>
                      {dataset.source_name ? (
                        <div className="flex items-center gap-2">
                          {dataset.source_type && <DataSourceIcon type={dataset.source_type} className="h-4 w-4" />}
                          {dataset.source_name}
                        </div>
                      ) : (
                        dataset.source_id
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{dataset.query_type}</span>
                    </TableCell>
                    <TableCell>{new Date(dataset.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(dataset)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(dataset.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div>No datasets found.</div>
        )}
      </CardContent>

      {/* Dialog for creating/editing dataset */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50">
          <div className="relative m-auto mt-20 max-w-4xl rounded-lg bg-white p-6">
            <DatasetForm
              dataset={editingDataset || undefined}
              onSuccess={() => {
                refetch();
                handleDialogClose();
              }}
              onCancel={handleDialogClose}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default Datasets;
