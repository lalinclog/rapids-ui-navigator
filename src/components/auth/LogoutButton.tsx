
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate('/login');
  };

  return (
    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
      <LogOut className="mr-2 h-4 w-4" />
      <span>Logout</span>
    </Button>
  );
};

export default LogoutButton;
