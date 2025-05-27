
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardHeader } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Shield, 
  Key, 
  User, 
  Users, 
  Database, 
  Settings, 
  Trash,
  CheckCircle,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import AccessRequestsManagement from '@/components/auth/AccessRequestsManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserItem {
  username: string;
  email: string;
  roles: string[];
}

interface RoleItem {
  name: string;
  description: string;
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is admin
    const userRoles = authState.user?.realm_access?.roles || [];
    const isAdmin = userRoles.includes('admin');
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access the admin area.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
    
    fetchData();
  }, [authState, navigate]);
  
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch users
      const usersResponse = await axios.get('/api/admin/users');
      setUsers(usersResponse.data);
      
      // Fetch roles
      const rolesResponse = await axios.get('/api/admin/roles');
      setRoles(rolesResponse.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch admin data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AppLayout>
      <DashboardHeader 
        title="Admin Dashboard" 
        description="Manage users, roles, and system settings"
        onRefresh={fetchData}
        isRefreshing={isLoading}
      />
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-3 md:w-[500px]">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="access">Access Requests</TabsTrigger>
        </TabsList>
        
        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts and their role assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.username}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((role, idx) => (
                                <Badge key={idx} variant="outline">{role}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm">Edit</Button>
                              <Button size="sm" variant="destructive">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2">Loading roles...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.name}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4" />
                              <span>{role.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{role.description}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Access Requests Tab */}
        <TabsContent value="access" className="space-y-6">
          <AccessRequestsManagement />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Admin;