
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  description,
  action
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="mt-4 md:mt-0 flex items-center">
          {action}
        </div>
      )}
    </div>
  );
};

interface DashboardHeaderProps extends HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  onRefresh, 
  isRefreshing = false,
  ...props 
}) => {
  const { toast } = useToast();
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      toast({
        title: "Refreshing data",
        description: "Getting the latest data from the server",
      });
    }
  };
  
  return (
    <Header 
      {...props} 
      action={
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-3" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      }
    />
  );
};
