import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Home, Settings, History, LineChart, BarChart3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import LogoutButton from '../auth/LogoutButton';

interface SideNavLinkProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ [key: string]: any }>;
  isOpen: boolean;
}

const SideNavLink: React.FC<SideNavLinkProps> = ({ to, label, icon: Icon, isOpen }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-2 rounded-md p-2 text-sm font-semibold transition-colors hover:bg-secondary hover:text-secondary-foreground",
          isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span className={cn("transition-opacity", {
          "opacity-0 hidden": !isOpen,
          "opacity-100": isOpen
        })}>
          {label}
        </span>
      </Link>
    </li>
  );
};

interface SideNavProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SideNav = ({ isOpen, setIsOpen }: SideNavProps) => {
  const { pathname } = useLocation();
  const { authState } = useAuth();
  
  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  const links = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/qualification", label: "Qualification", icon: LineChart },
    { to: "/profiling", label: "Profiling", icon: BarChart3 },
    { to: "/history", label: "Job History", icon: History },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/analytics", label: "Analytics", icon: List },
  ];
  
  return (
    <div className="h-full flex flex-col border-r bg-background shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <h1 className={cn("font-bold text-xl transition-opacity", {
          "opacity-0 hidden": !isOpen,
          "opacity-100": isOpen
        })}>
          Spark Analyzer
        </h1>
        <Button variant="ghost" size="icon" onClick={toggleNav}>
          {isOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
        </Button>
      </div>

      {/* User info if available */}
      {authState.user && isOpen && (
        <div className="px-4 py-2 border-t border-b border-border">
          <p className="text-sm font-medium">{authState.user.preferred_username}</p>
          {authState.user.email && <p className="text-xs text-muted-foreground">{authState.user.email}</p>}
        </div>
      )}
      
      <div className="flex flex-col flex-1 py-4">
        <ul>
          {links.map((link) => (
            <SideNavLink key={link.to} to={link.to} label={link.label} icon={link.icon} isOpen={isOpen} />
          ))}
        </ul>
      </div>
      
      <div className="p-4 border-t">
        <LogoutButton />
      </div>
    </div>
  );
};
