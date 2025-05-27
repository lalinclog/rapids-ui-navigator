
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card,
  CardContent, 
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Shield, User, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface AccessRequest {
  id: number;
  user_id: string;
  dataset_id: number;
  permission: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  username?: string;  // Added during data enrichment
  datasetName?: string;  // Added during data enrichment
}

// Mock data mapping user IDs to names
const userIdToName: Record<string, string> = {
  'admin_user': 'Admin User',
  'engineer_user': 'Engineer User',
  'data_steward_user': 'Data Steward',
  'analyst_user': 'Analyst User',
  'marketing_user': 'Marketing User',
  'sales_user': 'Sales User'
};

// Mock data mapping dataset IDs to names
const datasetIdToName: Record<number, string> = {
  1: 'Sales Analytics Dataset',
  2: 'Customer Segmentation Dataset',
  3: 'Product Performance Dataset'
};

const AccessRequestsManagement: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { toast } = useToast();
  const { authState } = useAuth();
  
  useEffect(() => {
    fetchRequests();
    // Check if user is an admin
    if (authState.user?.realm_access?.roles?.includes('admin')) {
      setIsAdmin(true);
    }
  }, [authState.user]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/access-requests');
      
      // Enrich the data with usernames and dataset names
      const enrichedRequests = response.data.map((req: AccessRequest) => ({
        ...req,
        username: userIdToName[req.user_id] || req.user_id,
        datasetName: datasetIdToName[req.dataset_id] || `Dataset ${req.dataset_id}`
      }));
      
      setRequests(enrichedRequests);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch access requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      await axios.post(`/api/access-requests/${requestId}/approve`);
      
      // Update the local state
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved', updated_at: new Date().toISOString() } 
            : req
        )
      );
      
      toast({
        title: "Success",
        description: "Access request approved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve access request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await axios.post(`/api/access-requests/${requestId}/reject`);
      
      // Update the local state
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'rejected', updated_at: new Date().toISOString() } 
            : req
        )
      );
      
      toast({
        title: "Success",
        description: "Access request rejected successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject access request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Access Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No access requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>User</TableHead>}
                  <TableHead>Dataset</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Requested On</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                    </TableCell>
                    
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{request.username}</span>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>{request.datasetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {request.permission}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    
                    {isAdmin && (
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(request.id)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(request.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {request.updated_at 
                              ? `Updated ${format(new Date(request.updated_at), 'MMM d, yyyy')}` 
                              : 'No action needed'}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessRequestsManagement;