
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={`fixed inset-y-0 z-10 ${sidebarOpen ? "md:w-64" : "md:w-16"} transition-all duration-300`}>
        <SideNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>
      
      <div 
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? "md:ml-64" : "md:ml-16"
        }`}
      >
        <main className="relative flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
