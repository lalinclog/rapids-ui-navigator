
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Trash } from 'lucide-react';
import axios from 'axios';
import { format, isAfter } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only present on newly created keys
  created_at: string;
  expires_at: string;
  description?: string;
}

const ApiKeyManagement: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyDescription, setNewKeyDescription] = useState<string>('');
  const [newKeyExpirationDays, setNewKeyExpirationDays] = useState<number>(30);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/api-keys');
      setApiKeys(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Validation Error",
        description: "API key name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await axios.post('/api/api-keys', {
        name: newKeyName,
        expiration_days: newKeyExpirationDays,
        description: newKeyDescription || undefined
      });
      
      // Store the newly created key to display it
      setNewlyCreatedKey(response.data);
      
      // Update the list of keys
      setApiKeys(prevKeys => [
        {
          id: response.data.id,
          name: response.data.name,
          created_at: response.data.created_at,
          expires_at: response.data.expires_at,
          description: response.data.description
        },
        ...prevKeys
      ]);
      
      // Clear form
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyExpirationDays(30);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`/api/api-keys/${keyId}`);
      
      setApiKeys(prevKeys => prevKeys.filter(key => key.id !== keyId));
      
      toast({
        title: "Success",
        description: "API key deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "Copied",
      description: "API key copied to clipboard!",
    });
  };

  const isKeyExpired = (expiresAt: string) => {
    const expireDate = new Date(expiresAt);
    const now = new Date();
    return isAfter(now, expireDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My API Key"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-description">Description (Optional)</Label>
                <Input
                  id="key-description"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="What this API key is used for"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="key-expiration">Expires After (Days)</Label>
                <Input
                  id="key-expiration"
                  type="number"
                  value={newKeyExpirationDays}
                  onChange={(e) => setNewKeyExpirationDays(parseInt(e.target.value))}
                  min={1}
                  max={365}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleCreateApiKey}>Create API Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Display newly created API key */}
      {newlyCreatedKey && (
        <Card className="border-2 border-green-500 dark:border-green-700">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400 flex items-center">
              New API Key Created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md relative">
              <p className="font-mono break-all">{newlyCreatedKey.key}</p>
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute top-2 right-2"
                onClick={() => newlyCreatedKey.key && handleCopyApiKey(newlyCreatedKey.key)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
              Make sure to copy this key now. For security reasons, it will never be displayed again.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => setNewlyCreatedKey(null)}
              className="w-full"
            >
              I've Copied My API Key
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading API keys...</p>
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">You don't have any API keys yet.</p>
            <Button onClick={() => setIsDialogOpen(true)} className="mt-4">Create Your First API Key</Button>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{key.name}</p>
                    {key.description && (
                      <p className="text-xs text-muted-foreground">{key.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(key.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(key.expires_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {isKeyExpired(key.expires_at) ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDeleteApiKey(key.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete API Key</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <Card className="bg-slate-50 dark:bg-slate-900">
        <CardContent className="py-4">
          <div className="space-y-2">
            <h4 className="font-semibold">How to use API Keys</h4>
            <p className="text-sm text-muted-foreground">
              Include your API key in the HTTP header of your requests:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
              <code className="text-sm">
                X-API-Key: your-api-key-here
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeyManagement;