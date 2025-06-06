import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Group {
  id: string;
  name: string;
  path: string;
}

interface Owner {
  type: 'user' | 'group';
  id: string;
  name: string;
}

const IcebergNamespaceManager = () => {
  const { toast } = useToast();
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNamespace, setNewNamespace] = useState({
    name: '',
    description: '',
    owners: [] as Owner[],
    pii_classification: '',
    retention_policy: '',
    location: ''
  });

  useEffect(() => {
    fetchNamespaces();
    fetchUsersAndGroups();
  }, []);

  const fetchUsersAndGroups = async () => {
    try {
      const [usersResponse, groupsResponse] = await Promise.all([
        axios.get('/api/keycloak/users'),
        axios.get('/api/keycloak/groups')
      ]);
      
      setUsers(usersResponse.data.users || []);
      setGroups(groupsResponse.data.groups || []);
    } catch (error) {
      console.error('Error fetching users and groups:', error);
      toast({
        title: "Error",
        description: "Failed to load users and groups",
        variant: "destructive"
      });
    }
  };

  const fetchNamespaces = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/iceberg/namespaces');
      setNamespaces(response.data.namespaces || []);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      toast({
        title: "Error",
        description: "Failed to load namespaces",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNamespace = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/iceberg/namespaces', {
        namespace: newNamespace.name,
        properties: {
          description: newNamespace.description,
          owner: newNamespace.owners.map(owner => `${owner.type}:${owner.id}`).join(','),
          pii_classification: newNamespace.pii_classification,
          retention_policy: newNamespace.retention_policy,
          location: newNamespace.location
        }
      });

      toast({
        title: "Success",
        description: `Namespace "${newNamespace.name}" created successfully`,
      });
      fetchNamespaces();
      setShowCreateForm(false);
      setNewNamespace({ name: '', description: '', owners: [], pii_classification: '', retention_policy: '', location: '' });
    } catch (error: any) {
      console.error('Error creating namespace:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to create namespace',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNamespace = async (namespace: string) => {
    if (window.confirm(`Are you sure you want to delete namespace "${namespace}"?`)) {
      setLoading(true);
      try {
        await axios.delete(`/api/iceberg/namespaces/${namespace}`);
        toast({
          title: "Success",
          description: `Namespace "${namespace}" deleted successfully`,
        });
        fetchNamespaces();
      } catch (error: any) {
        console.error('Error deleting namespace:', error);
        toast({
          title: "Error",
          description: error.response?.data?.detail || 'Failed to delete namespace',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const addOwner = (type: 'user' | 'group', id: string, name: string) => {
    const ownerExists = newNamespace.owners.some(owner => owner.type === type && owner.id === id);
    if (!ownerExists) {
      setNewNamespace(prev => ({
        ...prev,
        owners: [...prev.owners, { type, id, name }]
      }));
    }
  };

  const removeOwner = (index: number) => {
    setNewNamespace(prev => ({
      ...prev,
      owners: prev.owners.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Iceberg Namespaces</h2>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Namespace
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Namespace</CardTitle>
            <CardDescription>Define a new Iceberg namespace with proper governance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="namespace-name">Namespace Name *</Label>
              <Input
                id="namespace-name"
                value={newNamespace.name}
                onChange={(e) => setNewNamespace(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., sales_analytics"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newNamespace.description}
                onChange={(e) => setNewNamespace(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose of this namespace"
              />
            </div>

            <div>
              <Label>Owners *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select onValueChange={(value) => {
                    const [type, id] = value.split(':');
                    if (type === 'user') {
                      const user = users.find(u => u.id === id);
                      if (user) addOwner('user', id, user.username);
                    } else {
                      const group = groups.find(g => g.id === id);
                      if (group) addOwner('group', id, group.name);
                    }
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select user or group" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-sm font-medium text-gray-500">Users</div>
                      {users.map(user => (
                        <SelectItem key={`user:${user.id}`} value={`user:${user.id}`}>
                          {user.username} ({user.email})
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-sm font-medium text-gray-500 border-t mt-2 pt-2">Groups</div>
                      {groups.map(group => (
                        <SelectItem key={`group:${group.id}`} value={`group:${group.id}`}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {newNamespace.owners.map((owner, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {owner.type === 'user' ? '👤' : '👥'} {owner.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-red-100"
                        onClick={() => removeOwner(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="pii-classification">PII Classification *</Label>
              <Select onValueChange={(value) => setNewNamespace(prev => ({ ...prev, pii_classification: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PII classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retention-policy">Retention Policy</Label>
              <Input
                id="retention-policy"
                value={newNamespace.retention_policy}
                onChange={(e) => setNewNamespace(prev => ({ ...prev, retention_policy: e.target.value }))}
                placeholder="e.g., 7 years"
              />
            </div>

            <div>
              <Label htmlFor="location">Custom Location (optional)</Label>
              <Input
                id="location"
                value={newNamespace.location}
                onChange={(e) => setNewNamespace(prev => ({ ...prev, location: e.target.value }))}
                placeholder="s3://custom-bucket/path/"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNamespace} disabled={loading}>
                {loading ? 'Creating...' : 'Create Namespace'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-xl font-semibold">Existing Namespaces</h3>
        {loading ? (
          <p>Loading namespaces...</p>
        ) : (
          <ul className="list-disc pl-5">
            {namespaces.map(namespace => (
              <li key={namespace} className="flex items-center justify-between py-2">
                <span>{namespace}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteNamespace(namespace)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default IcebergNamespaceManager;
