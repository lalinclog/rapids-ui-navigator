import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, X, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import AuthService from '@/services/AuthService';
import {
  listNamespaces,
  createNamespace,
  getNamespaceDetails,
  updateNamespaceProperties,
  deleteNamespace
} from '@/lib/api/iceberg';

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

interface ApiNamespaceProperties {
  warehouse?: string;
  bucket?: string;
  location?: string;
  compression?: string;
  retention_policy?: string;
  description?: string;
  owner?: string;
  pii_classification?: string;
}

interface ApiNamespace {
  name: string;
  properties: ApiNamespaceProperties;
}

interface NamespaceProperties {
  description: string;
  owner: string;
  pii_classification: string;
  retention_policy: string;
  location: string;
}

const IcebergNamespaceManager = () => {
  const { toast } = useToast();
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [namespacesWithDetails, setNamespacesWithDetails] = useState<ApiNamespace[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [namespaceProperties, setNamespaceProperties] = useState<ApiNamespaceProperties | null>(null);
  const [newNamespace, setNewNamespace] = useState({
    name: '',
    description: '',
    owners: [] as Owner[],
    pii_classification: '',
    retention_policy: '',
    location: ''
  });
  const [editNamespace, setEditNamespace] = useState({
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
      // Get auth token for API requests
      const token = await AuthService.getValidToken();
      
      if (!token) {
        console.error('No authentication token available');
        toast({
          title: "Authentication Error",
          description: "Could not authenticate request to fetch users and groups",
          variant: "destructive"
        });
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [usersResponse, groupsResponse] = await Promise.all([
        axios.get('/api/keycloak/users', { headers }),
        axios.get('/api/keycloak/groups', { headers })
      ]);
      
      console.log('Users response:', usersResponse.data);
      console.log('Groups response:', groupsResponse.data);
      
      // Safely extract users and groups arrays from the response
      const usersData = usersResponse.data?.users || [];
      const groupsData = groupsResponse.data?.groups || [];
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
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
      const token = await AuthService.getValidToken();
      
      // Use Iceberg API with token
      const namespacesData = await listNamespaces(token || undefined);
      console.log('Raw namespaces response:', namespacesData);
      
      // Handle both string array and object array responses
      let namespaceNames: string[];
      let namespacesWithDetailsData: ApiNamespace[];
      
      if (Array.isArray(namespacesData) && namespacesData.length > 0) {
        if (typeof namespacesData[0] === 'string') {
          // Response is array of strings
          namespaceNames = namespacesData as string[];
          console.log('Processing namespaces as string array:', namespaceNames);
          
          // Fetch details for each namespace
          namespacesWithDetailsData = await Promise.all(
            namespaceNames.map(async (namespaceName: string) => {
              try {
                console.log('Fetching details for namespace:', namespaceName);
                const details = await getNamespaceDetails(namespaceName, token || undefined);
                console.log('Namespace details:', details);
                return details;
              } catch (error) {
                console.error(`Error fetching details for namespace ${namespaceName}:`, error);
                return {
                  name: namespaceName,
                  properties: {}
                };
              }
            })
          );
        } else {
          // Response is array of objects - properly type cast
          console.log('Processing namespaces as object array');
          namespacesWithDetailsData = namespacesData.map(ns => {
            if (typeof ns === 'string') {
              return { name: ns, properties: {} };
            }
            return ns as ApiNamespace;
          });
          namespaceNames = namespacesWithDetailsData.map(ns => ns.name);
        }
      } else {
        namespaceNames = [];
        namespacesWithDetailsData = [];
      }
      
      console.log('Final namespace names:', namespaceNames);
      console.log('Final namespaces with details:', namespacesWithDetailsData);
      
      setNamespaces(namespaceNames);
      setNamespacesWithDetails(namespacesWithDetailsData);
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

  const fetchNamespaceProperties = async (namespaceName: string) => {
    // Add extra validation and logging
    console.log('fetchNamespaceProperties called with:', namespaceName, 'type:', typeof namespaceName);
    
    if (!namespaceName || typeof namespaceName !== 'string') {
      console.error('Invalid namespace name:', namespaceName);
      toast({
        title: "Error",
        description: "Invalid namespace name provided",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      
      console.log('Fetching details for namespace string:', namespaceName);
      
      // Use Iceberg API with token
      const namespaceDetails = await getNamespaceDetails(namespaceName, token || undefined);
      const properties = namespaceDetails.properties || {};
      
      // Parse owner information from the properties
      const owners: Owner[] = [];
      if (properties.owner) {
        const ownerEntries = properties.owner.split(',').map((owner: string) => owner.trim());
        for (const entry of ownerEntries) {
          const [type, id] = entry.split(':');
          if (type === 'user') {
            const user = users.find(u => u.id === id);
            if (user) owners.push({ type: 'user', id, name: user.username });
          } else if (type === 'group') {
            const group = groups.find(g => g.id === id);
            if (group) owners.push({ type: 'group', id, name: group.name });
          }
        }
      }

      setEditNamespace({
        description: properties.description || '',
        owners,
        pii_classification: properties.pii_classification || '',
        retention_policy: properties.retention_policy || '',
        location: properties.location || ''
      });
      
      setNamespaceProperties(properties);
      setSelectedNamespace(namespaceName);
      setShowEditForm(true);
    } catch (error) {
      console.error('Error fetching namespace properties:', error);
      toast({
        title: "Error",
        description: "Failed to load namespace properties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNamespace = async () => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      
      // Use Iceberg API with token
      const properties: Record<string, string> = {
        description: newNamespace.description,
        owner: newNamespace.owners.map(owner => `${owner.type}:${owner.id}`).join(','),
        pii_classification: newNamespace.pii_classification,
        retention_policy: newNamespace.retention_policy,
        location: newNamespace.location || `s3://iceberg-warehouse/${newNamespace.name}/`,
        // Keep MinIO as object storage
        warehouse: 's3://iceberg-warehouse',
        bucket: 'iceberg-warehouse'
      };

      await createNamespace(newNamespace.name, properties, token || undefined);

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
        description: error.message || 'Failed to create namespace',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNamespace = async () => {
    setLoading(true);
    try {
      const token = await AuthService.getValidToken();
      
      // Use Iceberg API with token
      const properties: Record<string, string> = {
        description: editNamespace.description,
        owner: editNamespace.owners.map(owner => `${owner.type}:${owner.id}`).join(','),
        pii_classification: editNamespace.pii_classification,
        retention_policy: editNamespace.retention_policy,
        location: editNamespace.location,
        // Keep MinIO as object storage
        warehouse: 's3://iceberg-warehouse',
        bucket: 'iceberg-warehouse'
      };

      await updateNamespaceProperties(selectedNamespace, properties, token || undefined);

      toast({
        title: "Success",
        description: `Namespace "${selectedNamespace}" updated successfully`,
      });
      fetchNamespaces();
      setShowEditForm(false);
    } catch (error: any) {
      console.error('Error updating namespace:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update namespace',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNamespace = async (namespaceName: string) => {
    if (window.confirm(`Are you sure you want to delete namespace "${namespaceName}"?`)) {
      setLoading(true);
      try {
        const token = await AuthService.getValidToken();
        
        // Use Iceberg API with token
        await deleteNamespace(namespaceName, token || undefined);
        toast({
          title: "Success",
          description: `Namespace "${namespaceName}" deleted successfully`,
        });
        fetchNamespaces();
      } catch (error: any) {
        console.error('Error deleting namespace:', error);
        toast({
          title: "Error",
          description: error.message || 'Failed to delete namespace',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const addOwner = (type: 'user' | 'group', id: string, name: string, isEdit: boolean = false) => {
    if (isEdit) {
      const ownerExists = editNamespace.owners.some(owner => owner.type === type && owner.id === id);
      if (!ownerExists) {
        setEditNamespace(prev => ({
          ...prev,
          owners: [...prev.owners, { type, id, name }]
        }));
      }
    } else {
      const ownerExists = newNamespace.owners.some(owner => owner.type === type && owner.id === id);
      if (!ownerExists) {
        setNewNamespace(prev => ({
          ...prev,
          owners: [...prev.owners, { type, id, name }]
        }));
      }
    }
  };

  const removeOwner = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditNamespace(prev => ({
        ...prev,
        owners: prev.owners.filter((_, i) => i !== index)
      }));
    } else {
      setNewNamespace(prev => ({
        ...prev,
        owners: prev.owners.filter((_, i) => i !== index)
      }));
    }
  };

  const renderOwnerSelector = (isEdit: boolean = false) => {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select onValueChange={(value) => {
            const [type, id] = value.split(':');
            if (type === 'user') {
              const user = users.find(u => u.id === id);
              if (user) addOwner('user', id, user.username, isEdit);
            } else {
              const group = groups.find(g => g.id === id);
              if (group) addOwner('group', id, group.name, isEdit);
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
          {(isEdit ? editNamespace.owners : newNamespace.owners).map((owner, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {owner.type === 'user' ? '👤' : '👥'} {owner.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-red-100"
                onClick={() => removeOwner(index, isEdit)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    );
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
              {renderOwnerSelector()}
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
              <Label htmlFor="retention-policy">Data Retention Policy</Label>
              <Select onValueChange={(value) => setNewNamespace(prev => ({ ...prev, retention_policy: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">30 days (Development/Testing)</SelectItem>
                  <SelectItem value="90d">90 days (Short-term analytics)</SelectItem>
                  <SelectItem value="1y">1 year (Standard business data)</SelectItem>
                  <SelectItem value="3y">3 years (Financial/Compliance)</SelectItem>
                  <SelectItem value="7y">7 years (Legal/Regulatory)</SelectItem>
                  <SelectItem value="indefinite">Indefinite (Archive/Historical)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Choose how long data should be retained based on business and compliance requirements
              </p>
            </div>

            <div>
              <Label htmlFor="location">Custom Location (optional)</Label>
              <Input
                id="location"
                value={newNamespace.location}
                onChange={(e) => setNewNamespace(prev => ({ ...prev, location: e.target.value }))}
                placeholder={`Default: s3://iceberg-warehouse/${newNamespace.name || 'namespace-name'}/`}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to use default location: s3://iceberg-warehouse/{newNamespace.name || 'namespace-name'}/
              </p>
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

      {showEditForm && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Namespace: {selectedNamespace}</CardTitle>
            <CardDescription>Update namespace properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={editNamespace.description}
                onChange={(e) => setEditNamespace(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose of this namespace"
              />
            </div>

            <div>
              <Label>Owners *</Label>
              {renderOwnerSelector(true)}
            </div>

            <div>
              <Label htmlFor="edit-pii-classification">PII Classification *</Label>
              <Select 
                value={editNamespace.pii_classification}
                onValueChange={(value) => setEditNamespace(prev => ({ ...prev, pii_classification: value }))}
              >
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
              <Label htmlFor="edit-retention-policy">Data Retention Policy</Label>
              <Select 
                value={editNamespace.retention_policy}
                onValueChange={(value) => setEditNamespace(prev => ({ ...prev, retention_policy: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">30 days (Development/Testing)</SelectItem>
                  <SelectItem value="90d">90 days (Short-term analytics)</SelectItem>
                  <SelectItem value="1y">1 year (Standard business data)</SelectItem>
                  <SelectItem value="3y">3 years (Financial/Compliance)</SelectItem>
                  <SelectItem value="7y">7 years (Legal/Regulatory)</SelectItem>
                  <SelectItem value="indefinite">Indefinite (Archive/Historical)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Choose how long data should be retained based on business and compliance requirements
              </p>
            </div>

            <div>
              <Label htmlFor="edit-location">Custom Location (optional)</Label>
              <Input
                id="edit-location"
                value={editNamespace.location}
                onChange={(e) => setEditNamespace(prev => ({ ...prev, location: e.target.value }))}
                placeholder="s3://custom-bucket/path/"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateNamespace} disabled={loading}>
                {loading ? 'Updating...' : 'Update Namespace'}
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
          <div className="space-y-2">
            {namespacesWithDetails.map(namespace => (
              <Card key={namespace.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{namespace.name}</h4>
                    <div className="text-sm text-gray-500 space-y-1">
                      {namespace.properties.location && (
                        <p>Location: {namespace.properties.location}</p>
                      )}
                      {namespace.properties.description && (
                        <p>Description: {namespace.properties.description}</p>
                      )}
                      {namespace.properties.retention_policy && (
                        <p>Retention: {namespace.properties.retention_policy}</p>
                      )}
                      {namespace.properties.pii_classification && (
                        <p>Classification: {namespace.properties.pii_classification}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Edit button clicked for namespace:', namespace.name);
                        fetchNamespaceProperties(namespace.name);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        console.log('Delete button clicked for namespace:', namespace.name);
                        handleDeleteNamespace(namespace.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IcebergNamespaceManager;
