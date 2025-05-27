
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart,
  Activity,
  Cpu,
  History,
  Settings,
  FileText,
  LogOut,
  User,
  Shield,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/auth/LogoutButton';
import { useAuth } from '@/contexts/AuthContext';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, end = false, onClick }) => {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center py-2 px-3 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground'
        )
      }
      end={end}
    >
      <Icon className="h-5 w-5 mr-3 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
};

export function SideNav() {
  const { authState } = useAuth();
  const userRoles = authState.user?.realm_access?.roles || [];
  const isAdmin = userRoles.includes('admin');
  const isEngineer = userRoles.includes('engineer');

  return (
    <div className="space-y-6 py-4">
      <div className="px-4 py-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
          Navigation
        </h2>
        <div className="space-y-1">
          <NavItem to="/" icon={BarChart} label="Dashboard" end />
          <NavItem to="/analytics" icon={Activity} label="Analytics" />
          <NavItem to="/qualification" icon={FileText} label="Qualification" />
          <NavItem to="/profiling" icon={Cpu} label="Profiling" />
          <NavItem to="/history" icon={History} label="Job History" />
        </div>
      </div>

      <div className="px-4 py-2">
        <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
          Account
        </h2>
        <div className="space-y-1">
          <NavItem to="/profile" icon={User} label="My Profile" />
          <NavItem to="/profile?tab=api-keys" icon={Key} label="API Keys" />
          {isAdmin && (
            <NavItem to="/admin" icon={Shield} label="Admin Panel" />
          )}
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}