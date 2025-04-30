
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
}

export const ToolCard: React.FC<ToolCardProps> = ({ 
  title, 
  description, 
  icon, 
  path,
  stats = []
}) => {
  const navigate = useNavigate();

  return (
    <Card className="tool-card">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-lg bg-nvidia-green/10 text-nvidia-green">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-muted/40 rounded-md p-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-medium mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full justify-between hover:border-nvidia-green hover:text-nvidia-green"
          onClick={() => navigate(path)}
        >
          Open Tool
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
};
