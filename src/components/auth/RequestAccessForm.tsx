
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

interface RequestAccessFormProps {
  datasetId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RequestAccessForm: React.FC<RequestAccessFormProps> = ({ 
  datasetId = 0, 
  onSuccess,
  onCancel 
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number>(datasetId || 0);
  const [permission, setPermission] = useState<string>('read');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [availableDatasets, setAvailableDatasets] = useState<{id: number, name: string}[]>([
    { id: 1, name: 'Sales Analytics Dataset' },
    { id: 2, name: 'Customer Segmentation Dataset' },
    { id: 3, name: 'Product Performance Dataset' }
  ]);
  const { toast } = useToast();
  const { authState } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDatasetId) {
      toast({
        title: "Validation Error",
        description: "Please select a dataset",
        variant: "destructive"
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for your request",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/access-requests', {
        dataset_id: selectedDatasetId,
        permission,
        reason
      });
      
      toast({
        title: "Request Submitted",
        description: "Your access request has been submitted successfully and is pending approval.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit access request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Request Access</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <Select
              value={selectedDatasetId.toString()}
              onValueChange={(value) => setSelectedDatasetId(parseInt(value))}
            >
              <SelectTrigger id="dataset">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {availableDatasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id.toString()}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="permission">Permission Level</Label>
            <Select
              value={permission}
              onValueChange={setPermission}
            >
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select permission level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="write">Write</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need access to this dataset"
              rows={4}
              required
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default RequestAccessForm;