
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Settings, 
  User, 
  History,
  Zap,
  Target,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SideNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const SideNav: React.FC<SideNavProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Qualification', href: '/qualification', icon: Target },
    { name: 'Profiling', href: '/profiling', icon: Zap },
    { name: 'Job History', href: '/job-history', icon: History },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Add admin navigation for admin users
  if (user?.roles?.includes('admin')) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Users });
  }

  return (
    <div className={`flex flex-col h-full bg-card border-r transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex items-center justify-between p-4">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">RAPIDS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className={`${isOpen ? 'mr-3' : 'mx-auto'} h-5 w-5 flex-shrink-0`} />
              {isOpen && item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
