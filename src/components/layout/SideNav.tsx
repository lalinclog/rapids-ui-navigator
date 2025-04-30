
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, BarChart2, FileSearch, Home, Settings, Database } from 'lucide-react';

interface SideNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const SideNav: React.FC<SideNavProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  
  const navItems = [
    { 
      name: 'Dashboard', 
      icon: <Home className="h-5 w-5" />, 
      href: '/',
      active: location.pathname === '/' 
    },
    { 
      name: 'Qualification Tool', 
      icon: <FileSearch className="h-5 w-5" />, 
      href: '/qualification',
      active: location.pathname === '/qualification'
    },
    { 
      name: 'Profiling Tool', 
      icon: <BarChart2 className="h-5 w-5" />, 
      href: '/profiling',
      active: location.pathname === '/profiling'
    },
    { 
      name: 'Job History', 
      icon: <Database className="h-5 w-5" />, 
      href: '/history',
      active: location.pathname === '/history'
    },
    { 
      name: 'Settings', 
      icon: <Settings className="h-5 w-5" />, 
      href: '/settings',
      active: location.pathname === '/settings'
    }
  ];

  return (
    <div
      className={cn(
        "bg-sidebar fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <div className={cn("flex items-center", !isOpen && "justify-center w-full")}>
          {isOpen ? (
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-md bg-nvidia-green flex items-center justify-center">
                <span className="font-bold text-white">NV</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-sidebar-foreground">RAPIDS UI</span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-md bg-nvidia-green flex items-center justify-center">
              <span className="font-bold text-white">NV</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto py-4">
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                item.active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center"
              )}
            >
              {item.icon}
              {isOpen && <span className="ml-3">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="p-4">
        <div className={cn(
          "px-3 py-2 text-xs font-medium text-sidebar-foreground/70",
          !isOpen && "text-center"
        )}>
          {isOpen ? "RAPIDS v23.12.0" : "v23"}
        </div>
      </div>
    </div>
  );
};
