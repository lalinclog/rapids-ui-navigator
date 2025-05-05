
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, LayoutDashboard, Edit, Trash2, ExternalLink } from 'lucide-react';
import DashboardForm from './DashboardForm';

interface Dashboard {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_public: boolean;
  item_count: number;
}

const fetchDashboards = async (): Promise<Dashboard[]> => {
  const response = await fetch('/api/bi/dashboards');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboards');
  }
  return response.json();
};

const DashboardCard: React.FC<{ dashboard: Dashboard; onEdit: () => void; onDelete: () => void }> = ({ 
  dashboard, onEdit, onDelete 
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{dashboard.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {dashboard.description || "No description"}
            </CardDescription>
          </div>
          <Badge variant={dashboard.is_public ? "default" : "outline"}>
            {dashboard.is_public ? "Public" : "Private"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Charts:</span>{' '}
            {dashboard.item_count}
          </div>
          <div className="text-xs text-muted-foreground">
            By {dashboard.created_by}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(dashboard.updated_at).toLocaleDateString()}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" onClick={() => navigate(`/bi/dashboards/${dashboard.id}`)}>
            <ExternalLink className="h-4 w-4 mr-1" /> View
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const Dashboards: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);

  const { data: dashboards, isLoading, error } = useQuery({
    queryKey: ['dashboards'],
    queryFn: fetchDashboards,
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: async (dashboardId: number) => {
      const response = await fetch(`/api/bi/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete dashboard');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast({
        title: 'Dashboard deleted',
        description: 'Dashboard has been successfully deleted',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting dashboard',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleCreate = () => {
    setEditingDashboard(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (dashboard: Dashboard) => {
    if (confirm(`Are you sure you want to delete the dashboard "${dashboard.name}"? This will also delete all items on the dashboard.`)) {
      deleteDashboardMutation.mutate(dashboard.id);
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingDashboard(null);
    queryClient.invalidateQueries({ queryKey: ['dashboards'] });
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Dashboards</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Dashboard
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-1/3" />
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-1/3" />
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
        Error loading dashboards: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Dashboards</h2>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Dashboard
        </Button>
      </div>
      
      {dashboards && dashboards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <DashboardCard 
              key={dashboard.id} 
              dashboard={dashboard} 
              onEdit={() => handleEdit(dashboard)} 
              onDelete={() => handleDelete(dashboard)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-4">
            <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Dashboards</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first dashboard to organize and display your visualizations.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Dashboard
          </Button>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDashboard ? 'Edit Dashboard' : 'Create New Dashboard'}</DialogTitle>
          </DialogHeader>
          <DashboardForm 
            dashboard={editingDashboard ?? undefined} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboards;
