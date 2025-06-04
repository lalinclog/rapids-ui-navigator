
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Database, Loader2 } from 'lucide-react';

interface IcebergNamespace {
  name: string;
  location?: string;
  properties?: Record<string, string>;
  tables?: string[];
}

const fetchIcebergNamespaces = async (): Promise<IcebergNamespace[]> => {
  const response = await fetch('/api/iceberg/namespaces');
  if (!response.ok) {
    throw new Error('Failed to fetch Iceberg namespaces');
  }
  const data = await response.json();
  return data.namespaces || [];
};

const fetchNamespaceTables = async (namespace: string): Promise<string[]> => {
  const response = await fetch(`/api/iceberg/namespaces/${namespace}/tables`);
  if (!response.ok) {
    throw new Error('Failed to fetch namespace tables');
  }
  const data = await response.json();
  return data.tables || [];
};

const IcebergNamespaceManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);

  const { data: namespaces = [], isLoading } = useQuery({
    queryKey: ['iceberg-namespaces'],
    queryFn: fetchIcebergNamespaces,
  });

  const { data: namespaceTables = [] } = useQuery({
    queryKey: ['iceberg-namespace-tables', selectedNamespace],
    queryFn: () => fetchNamespaceTables(selectedNamespace!),
    enabled: !!selectedNamespace,
  });

  const createNamespaceMutation = useMutation({
    mutationFn: async (namespaceName: string) => {
      const response = await fetch('/api/iceberg/namespaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ namespace: namespaceName }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create namespace');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iceberg-namespaces'] });
      setIsCreateDialogOpen(false);
      setNewNamespaceName('');
      toast({
        title: 'Namespace created',
        description: 'Iceberg namespace has been created successfully',
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
      const response = await fetch(`/api/iceberg/namespaces/${namespaceName}`, {
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
      setSelectedNamespace(null);
      toast({
        title: 'Namespace deleted',
        description: 'Iceberg namespace has been deleted successfully',
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
    if (!newNamespaceName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid name',
        description: 'Namespace name cannot be empty',
      });
      return;
    }
    createNamespaceMutation.mutate(newNamespaceName.trim());
  };

  const handleDeleteNamespace = (namespaceName: string) => {
    if (confirm(`Are you sure you want to delete the namespace "${namespaceName}"? This action cannot be undone.`)) {
      deleteNamespaceMutation.mutate(namespaceName);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Iceberg Namespace Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading namespaces...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Iceberg Namespace Management
            </CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Namespace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {namespaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {namespaces.map((namespace) => (
                <Card 
                  key={namespace.name} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedNamespace === namespace.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedNamespace(namespace.name)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{namespace.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNamespace(namespace.name);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {namespace.location && (
                        <div className="text-xs text-muted-foreground">
                          Location: {namespace.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {namespace.tables?.length || 0} tables
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Namespaces Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Iceberg namespace to organize your tables.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create First Namespace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedNamespace && (
        <Card>
          <CardHeader>
            <CardTitle>Tables in "{selectedNamespace}"</CardTitle>
          </CardHeader>
          <CardContent>
            {namespaceTables.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {namespaceTables.map((tableName) => (
                    <TableRow key={tableName}>
                      <TableCell>{tableName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Iceberg Table</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No tables found in this namespace
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Namespace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="namespaceName">Namespace Name</Label>
              <Input
                id="namespaceName"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                placeholder="my_namespace"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNamespace}
              disabled={createNamespaceMutation.isPending}
            >
              {createNamespaceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IcebergNamespaceManager;
