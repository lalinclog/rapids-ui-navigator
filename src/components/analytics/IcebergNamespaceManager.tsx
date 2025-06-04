
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Database, Plus, Trash2, Info, Table } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Namespace {
  namespace: string;
  properties?: Record<string, string>;
  table_count?: number;
  tables?: string[];
}

interface CreateNamespaceData {
  name: string;
  description?: string;
}

const fetchNamespaces = async (): Promise<string[]> => {
  const response = await fetch('/api/iceberg/namespaces');
  if (!response.ok) {
    throw new Error('Failed to fetch namespaces');
  }
  const data = await response.json();
  return data.namespaces;
};

const fetchNamespaceDetails = async (namespace: string): Promise<Namespace> => {
  const response = await fetch(`/api/iceberg/namespaces/${namespace}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch namespace details for ${namespace}`);
  }
  return response.json();
};

const CreateNamespaceDialog: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateNamespaceData>();
  const queryClient = useQueryClient();

  const createNamespaceMutation = useMutation({
    mutationFn: async (data: CreateNamespaceData) => {
      const response = await fetch('/api/iceberg/namespaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          properties: data.description ? { description: data.description } : undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create namespace');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      toast({
        title: 'Namespace created',
        description: 'The Iceberg namespace has been created successfully',
      });
      setIsOpen(false);
      reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating namespace',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const onSubmit = (data: CreateNamespaceData) => {
    createNamespaceMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="mr-2 h-4 w-4" /> Create Namespace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Namespace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Namespace Name</Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Namespace name is required',
                pattern: {
                  value: /^[a-z][a-z0-9_]*$/,
                  message: 'Namespace name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores'
                }
              })}
              placeholder="my_namespace"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Description of the namespace"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const NamespaceCard: React.FC<{ 
  namespace: string; 
  onDelete: () => void;
  onViewDetails: () => void;
}> = ({ namespace, onDelete, onViewDetails }) => {
  const { data: details, isLoading } = useQuery({
    queryKey: ['namespace-details', namespace],
    queryFn: () => fetchNamespaceDetails(namespace),
  });

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{namespace}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Table className="h-3 w-3 mr-1" />
                  {isLoading ? '...' : `${details?.table_count || 0} tables`}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="space-y-3">
          {details?.properties?.description && (
            <div className="text-sm text-muted-foreground">
              {details.properties.description}
            </div>
          )}
          
          {details && details.table_count > 0 && (
            <div className="text-xs text-muted-foreground">
              Tables: {details.tables?.slice(0, 3).join(', ')}
              {details.tables && details.tables.length > 3 && '...'}
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-4 pt-0 flex justify-between border-t">
        <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1 mr-2">
          <Info className="h-4 w-4 mr-1" /> Details
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete} 
          className="px-2 text-destructive hover:text-destructive"
          disabled={details && details.table_count > 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

const IcebergNamespaceManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);

  const { data: namespaces, isLoading, error } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: fetchNamespaces,
  });

  const deleteNamespaceMutation = useMutation({
    mutationFn: async (namespace: string) => {
      const response = await fetch(`/api/iceberg/namespaces/${namespace}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete namespace');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      toast({
        title: 'Namespace deleted',
        description: 'The namespace has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting namespace',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleDelete = (namespace: string) => {
    if (confirm(`Are you sure you want to delete the namespace "${namespace}"? This action cannot be undone and the namespace must be empty.`)) {
      deleteNamespaceMutation.mutate(namespace);
    }
  };

  const handleViewDetails = (namespace: string) => {
    setSelectedNamespace(namespace);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold">Iceberg Namespaces</h3>
            <p className="text-muted-foreground">Manage your Iceberg data namespaces</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Namespace
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
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        Error loading namespaces: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Iceberg Namespaces
          </h3>
          <p className="text-muted-foreground">Organize your Iceberg tables into logical namespaces</p>
        </div>
        <CreateNamespaceDialog onSuccess={() => {}} />
      </div>

      {namespaces && namespaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {namespaces.map((namespace) => (
            <NamespaceCard 
              key={namespace} 
              namespace={namespace} 
              onDelete={() => handleDelete(namespace)}
              onViewDetails={() => handleViewDetails(namespace)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-6">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Namespaces</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first Iceberg namespace to organize your data tables. Namespaces help you group related tables together.
          </p>
          <CreateNamespaceDialog onSuccess={() => {}} />
        </div>
      )}
    </div>
  );
};

export default IcebergNamespaceManager;
