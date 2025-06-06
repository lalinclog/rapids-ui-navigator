
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const fetchNamespaces = async (): Promise<string[]> => {
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
  console.log('Fetched namespaces data:', data);
  return data.namespaces || [];
};

const IcebergNamespaceManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNamespace, setNewNamespace] = useState<NamespaceCreate>({
    name: '',
    properties: {
      location: 's3://iceberg-warehouse/',
      owner: '',
      description: '',
      retention_policy: '365d',
      compression: 'snappy'
    }
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
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create namespace');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Namespace created',
        description: 'Iceberg namespace and bucket have been successfully created',
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
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete namespace');
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

  const resetForm = () => {
    setNewNamespace({
      name: '',
      properties: {
        location: 's3://iceberg-warehouse/',
        owner: '',
        description: '',
        retention_policy: '365d',
        compression: 'snappy'
      }
    });
    setPropertyKey('');
    setPropertyValue('');
  };

  const handleCreateNamespace = () => {
    // Validate required fields
    if (!newNamespace.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Namespace name is required',
      });
      return;
    }

    if (!newNamespace.properties.owner?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Owner is required',
      });
      return;
    }

    if (!newNamespace.properties.description?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Description is required',
      });
      return;
    }

    // Update location to include namespace
    const updatedNamespace = {
      ...newNamespace,
      properties: {
        ...newNamespace.properties,
        location: `s3://iceberg-warehouse/${newNamespace.name}/`
      }
    };

    createNamespaceMutation.mutate(updatedNamespace);
  };

  const handleDeleteNamespace = (namespaceName: string) => {
    if (confirm(`Are you sure you want to delete the namespace "${namespaceName}"? This action cannot be undone.`)) {
      deleteNamespaceMutation.mutate(namespaceName);
    }
  };

  const updateProperty = (key: string, value: string) => {
    setNewNamespace(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [key]: value
      }
    }));
  };

  const addCustomProperty = () => {
    if (propertyKey && propertyValue) {
      updateProperty(propertyKey, propertyValue);
      setPropertyKey('');
      setPropertyValue('');
    }
  };

  const removeProperty = (key: string) => {
    // Don't allow removing mandatory properties
    const mandatoryProps = ['location', 'owner', 'description', 'retention_policy', 'compression'];
    if (mandatoryProps.includes(key)) {
      toast({
        variant: 'destructive',
        title: 'Cannot Remove',
        description: 'This is a mandatory property and cannot be removed',
      });
      return;
    }

    setNewNamespace(prev => {
      const { [key]: removed, ...rest } = prev.properties;
      return { ...prev, properties: rest };
    });
  };

  console.log('Component state - namespaces:', namespaces, 'isLoading:', isLoading, 'error:', error);

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
    console.error('Error in IcebergNamespaceManager:', error);
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
            Manage Iceberg namespaces for organizing your tables. Buckets will be created automatically.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Namespace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Namespace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Namespace Name *</Label>
                <Input
                  id="name"
                  value={newNamespace.name}
                  onChange={(e) => setNewNamespace(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., analytics, sales, marketing"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will create bucket: iceberg-warehouse/{newNamespace.name || 'namespace'}/
                </p>
              </div>
              
              <div>
                <Label htmlFor="owner">Owner *</Label>
                <Input
                  id="owner"
                  value={newNamespace.properties.owner || ''}
                  onChange={(e) => updateProperty('owner', e.target.value)}
                  placeholder="Enter owner name or team"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newNamespace.properties.description || ''}
                  onChange={(e) => updateProperty('description', e.target.value)}
                  placeholder="Describe the purpose of this namespace"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="retention">Retention Policy</Label>
                <Select 
                  value={newNamespace.properties.retention_policy || '365d'} 
                  onValueChange={(value) => updateProperty('retention_policy', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="180d">180 days</SelectItem>
                    <SelectItem value="365d">1 year</SelectItem>
                    <SelectItem value="1095d">3 years</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="compression">Default Compression</Label>
                <Select 
                  value={newNamespace.properties.compression || 'snappy'} 
                  onValueChange={(value) => updateProperty('compression', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select compression" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snappy">Snappy (recommended)</SelectItem>
                    <SelectItem value="gzip">GZIP</SelectItem>
                    <SelectItem value="lz4">LZ4</SelectItem>
                    <SelectItem value="zstd">ZSTD</SelectItem>
                    <SelectItem value="uncompressed">Uncompressed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Additional Properties</Label>
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
                    <Button type="button" onClick={addCustomProperty} size="sm">
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    {Object.entries(newNamespace.properties).map(([key, value]) => {
                      const isMandatory = ['location', 'owner', 'description', 'retention_policy', 'compression'].includes(key);
                      return (
                        <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">
                            {key}: {value}
                            {isMandatory && <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(key)}
                            disabled={isMandatory}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateNamespace}
                  disabled={createNamespaceMutation.isPending}
                >
                  {createNamespaceMutation.isPending ? 'Creating...' : 'Create Namespace & Bucket'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {namespaces && namespaces.length > 0 ? (
        <div className="grid gap-4">
          {namespaces.map((namespaceName) => (
            <Card key={namespaceName}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {namespaceName}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-muted-foreground">
                      Iceberg namespace • s3://iceberg-warehouse/{namespaceName}/
                    </CardDescription>
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
          ))}
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
