
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Camera, RotateCcw, Plus, Clock } from 'lucide-react';
import { 
  getTableSnapshots, 
  rollbackToSnapshot, 
  createTableSnapshot, 
  Snapshot 
} from '../../../nextjs-app/lib/api/iceberg';

interface SnapshotManagerProps {
  namespace: string;
  tableName: string;
}

const SnapshotManager: React.FC<SnapshotManagerProps> = ({ namespace, tableName }) => {
  const queryClient = useQueryClient();
  const [isCreateSnapshotOpen, setIsCreateSnapshotOpen] = useState(false);
  const [snapshotSummary, setSnapshotSummary] = useState('');

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['table-snapshots', namespace, tableName],
    queryFn: () => getTableSnapshots(namespace, tableName),
  });

  const rollbackMutation = useMutation({
    mutationFn: (snapshotId: string) => 
      rollbackToSnapshot(namespace, tableName, snapshotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-snapshots', namespace, tableName] });
      queryClient.invalidateQueries({ queryKey: ['table-details', namespace, tableName] });
      toast({
        title: 'Rollback successful',
        description: 'Table has been rolled back to the selected snapshot',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error during rollback',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () => createTableSnapshot(namespace, tableName, 
      snapshotSummary ? { description: snapshotSummary } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-snapshots', namespace, tableName] });
      toast({
        title: 'Snapshot created',
        description: 'New table snapshot has been created successfully',
      });
      setIsCreateSnapshotOpen(false);
      setSnapshotSummary('');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating snapshot',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });

  const handleRollback = (snapshot: Snapshot) => {
    if (confirm(`Are you sure you want to rollback to snapshot ${snapshot.snapshot_id}?`)) {
      rollbackMutation.mutate(snapshot.snapshot_id);
    }
  };

  const handleCreateSnapshot = () => {
    createSnapshotMutation.mutate();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return <div>Loading snapshot information...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Snapshot Management
          </h3>
          <p className="text-muted-foreground">
            Manage snapshots for {namespace}.{tableName}
          </p>
        </div>
        <Button onClick={() => setIsCreateSnapshotOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Snapshot
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table Snapshots</CardTitle>
          <CardDescription>
            {snapshots?.length || 0} snapshots available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots.map((snapshot: Snapshot) => (
                <div key={snapshot.snapshot_id} 
                     className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm">{snapshot.snapshot_id}</span>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatTimestamp(snapshot.timestamp_ms)}
                      </Badge>
                    </div>
                    {snapshot.summary && Object.keys(snapshot.summary).length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {Object.entries(snapshot.summary).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(snapshot)}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Rollback
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No snapshots found for this table
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateSnapshotOpen} onOpenChange={setIsCreateSnapshotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Table Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshot-summary">Description (Optional)</Label>
              <Textarea
                id="snapshot-summary"
                value={snapshotSummary}
                onChange={(e) => setSnapshotSummary(e.target.value)}
                placeholder="Enter a description for this snapshot"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateSnapshotOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSnapshot}
                disabled={createSnapshotMutation.isPending}
              >
                {createSnapshotMutation.isPending ? 'Creating...' : 'Create Snapshot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SnapshotManager;
