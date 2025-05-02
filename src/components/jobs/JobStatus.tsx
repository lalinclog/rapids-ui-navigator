
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  AlertTriangle
} from 'lucide-react';

type StatusType = 'completed' | 'running' | 'failed' | 'pending' | 'warning';

interface JobStatusProps {
  status: StatusType;
  progress?: number;
  large?: boolean;
}

export function JobStatus({ status, progress = 0, large = false }: JobStatusProps) {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          color: 'text-status-success',
          bgColor: 'bg-status-success/10',
          borderColor: 'border-status-success/30',
          icon: <CheckCircle className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
      case 'running':
        return {
          label: 'Running',
          color: 'text-status-info',
          bgColor: 'bg-status-info/10',
          borderColor: 'border-status-info/30',
          icon: <Play className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'text-status-error',
          bgColor: 'bg-status-error/10',
          borderColor: 'border-status-error/30',
          icon: <AlertCircle className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
      case 'pending':
        return {
          label: 'Pending',
          color: 'text-status-neutral',
          bgColor: 'bg-status-neutral/10',
          borderColor: 'border-status-neutral/30',
          icon: <Clock className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
      case 'warning':
        return {
          label: 'Warning',
          color: 'text-status-warning',
          bgColor: 'bg-status-warning/10',
          borderColor: 'border-status-warning/30',
          icon: <AlertTriangle className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-status-neutral',
          bgColor: 'bg-status-neutral/10',
          borderColor: 'border-status-neutral/30',
          icon: <Clock className={cn("h-4 w-4", large && "h-5 w-5")} />
        };
    }
  };

  const { label, color, bgColor, borderColor, icon } = getStatusConfig(status);
  
  return (
    <div className="flex flex-col items-end">
      <div className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
        bgColor, borderColor, color, 
        large && "text-sm px-2.5 py-1.5"
      )}>
        {icon}
        <span>{label}</span>
      </div>
      
      {status === 'running' && typeof progress === 'number' && (
        <div className={cn("w-full mt-2", large && "w-[200px]")}>
          <Progress value={progress} className="h-1" />
          <p className={cn("text-xs mt-1 text-right", large && "text-sm")}>
            {progress}% Complete
          </p>
        </div>
      )}
    </div>
  );
}
