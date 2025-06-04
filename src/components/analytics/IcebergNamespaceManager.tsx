
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Database, Trash2, Settings } from 'lucide-react';
import authService from '@/services/AuthService';

interface Namespace {
  namespace: string[];
  properties: Record<string, string>;
}

interface NamespaceCreate {
  name: string;
  properties: Record<string, string>;
}

const fetchNamespaces = async (): Promise<Namespace[]> => {
  const token = await authService.getValidToken();
  const response = await fetch('/api/iceberg/namespaces', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch namespaces');
  }
  const data = await response.json();
  return data.namespaces || [];
};

const IcebergNamespaceManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNamespace, setNewNamespace] = useState<NamespaceCreate>({
    name: '',
    properties: {}
  });
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');

  const { data: namespaces, isLoading, error } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: fetchNamespaces,
  });

  const createNamespaceMutation = useMutation({
    mutationFn: async (namespaceData: NamespaceCreate) => {
      const token = await authService.getValidToken();
      const response = await fetch('/api/iceberg/namespaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(namespaceData),
      });
      if (!response.ok) {
        throw new Error('Failed to create namespace');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      setIsCreateDialogOpen(false);
      setNewNamespace({ name: '', properties: {} });
      toast({
        title: 'Namespace created',
        description: 'Iceberg namespace has been successfully created',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating namespace',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const deleteNamespaceMutation = useMutation({
    mutationFn: async (namespaceName: string) => {
      const token = await authService.getValidToken();
      const response = await fetch(`/api/iceberg/namespaces/${namespaceName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete namespace');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      toast({
        title: 'Namespace deleted',
        description: 'Iceberg namespace has been successfully deleted',
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

  const handleCreateNamespace = () => {
    if (!newNamespace.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Namespace name is required',
      });
      return;
    }
    createNamespaceMutation.mutate(newNamespace);
  };

  const handleDeleteNamespace = (namespaceName: string) => {
    if (confirm(`Are you sure you want to delete the namespace "${namespaceName}"?`)) {
      deleteNamespaceMutation.mutate(namespaceName);
    }
  };

  const addProperty = () => {
    if (propertyKey && propertyValue) {
      setNewNamespace(prev => ({
        ...prev,
        properties: {
          ...prev.properties,
          [propertyKey]: propertyValue
        }
      }));
      setPropertyKey('');
      setPropertyValue('');
    }
  };

  const removeProperty = (key: string) => {
    setNewNamespace(prev => {
      const { [key]: removed, ...rest } = prev.properties;
      return { ...prev, properties: rest };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Iceberg Namespaces</h3>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Namespace
          </Button>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="h-5 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </CardHeader>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Iceberg Namespaces
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage Iceberg namespaces for organizing your tables
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Namespace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Namespace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Namespace Name</Label>
                <Input
                  id="name"
                  value={newNamespace.name}
                  onChange={(e) => setNewNamespace(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter namespace name"
                />
              </div>
              
              <div>
                <Label>Properties</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Property key"
                      value={propertyKey}
                      onChange={(e) => setPropertyKey(e.target.value)}
                    />
                    <Input
                      placeholder="Property value"
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(e.target.value)}
                    />
                    <Button type="button" onClick={addProperty} size="sm">
                      Add
                    </Button>
                  </div>
                  {Object.entries(newNamespace.properties).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{key}: {value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProperty(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateNamespace}
                  disabled={createNamespaceMutation.isPending}
                >
                  {createNamespaceMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {namespaces && namespaces.length > 0 ? (
        <div className="grid gap-4">
          {namespaces.map((namespace) => {
            const namespaceName = Array.isArray(namespace.namespace) 
              ? namespace.namespace.join('.') 
              : namespace.namespace;
            
            return (
              <Card key={namespaceName}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {namespaceName}
                      </CardTitle>
                      {Object.keys(namespace.properties).length > 0 && (
                        <CardDescription className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(namespace.properties).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNamespace(namespaceName)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Namespaces</h3>
          <p className="text-muted-foreground mb-4">
            Create your first Iceberg namespace to organize your tables
          </p>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Your First Namespace
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default IcebergNamespaceManager;
