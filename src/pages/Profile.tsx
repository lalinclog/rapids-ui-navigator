
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Key, User, FileKey } from 'lucide-react';
import ApiKeyManagement from '@/components/auth/ApiKeyManagement';
import RequestAccessForm from '@/components/auth/RequestAccessForm';
import AccessRequestsManagement from '@/components/auth/AccessRequestsManagement';
import { useAuth } from '@/contexts/AuthContext';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { authState } = useAuth();
  
  const userRoles = authState.user?.realm_access?.roles || [];
  
  return (
    <AppLayout>
      <Header 
        title="My Profile" 
        description="Manage your account and access settings"
      />
      
      <Tabs defaultValue="profile" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:w-[500px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>
                Your personal information and role assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                  <p className="font-medium">{authState.user?.preferred_username || "Not available"}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p className="font-medium">{authState.user?.email || "Not available"}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                  <p className="font-medium">
                    {[authState.user?.given_name, authState.user?.family_name].filter(Boolean).join(" ") || "Not available"}
                  </p>
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {userRoles.length > 0 ? (
                    userRoles.map((role, index) => (
                      <div key={index} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        {role}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No roles assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileKey className="mr-2 h-5 w-5" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Create and manage your API keys for programmatic access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Data Access Permissions
              </CardTitle>
              <CardDescription>
                Request and manage access to datasets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <RequestAccessForm 
                  onSuccess={() => {
                    // Refresh the permissions list after a successful request
                    // In a real app, you would fetch the updated list of access requests
                  }}
                />
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Your Access Requests</h3>
                  <AccessRequestsManagement />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Profile;