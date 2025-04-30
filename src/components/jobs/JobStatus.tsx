
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  XCircle,
  PlayCircle
} from 'lucide-react';

type Status = 'completed' | 'running' | 'failed' | 'pending' | 'warning';

interface JobStatusProps {
  status: Status;
  progress?: number;
  className?: string;
}

export function JobStatus({ status, progress = 0, className }: JobStatusProps) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle className="h-4 w-4" />,
      text: 'Completed',
      color: 'text-status-success',
      bgColor: 'bg-status-success/10',
      borderColor: 'border-status-success'
    },
    running: {
      icon: <PlayCircle className="h-4 w-4 animate-pulse-green" />,
      text: 'Running',
      color: 'text-nvidia-green',
      bgColor: 'bg-nvidia-green/10',
      borderColor: 'border-nvidia-green'
    },
    failed: {
      icon: <XCircle className="h-4 w-4" />,
      text: 'Failed',
      color: 'text-status-error',
      bgColor: 'bg-status-error/10',
      borderColor: 'border-status-error'
    },
    pending: {
      icon: <Clock className="h-4 w-4" />,
      text: 'Pending',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted'
    },
    warning: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: 'Warning',
      color: 'text-status-warning',
      bgColor: 'bg-status-warning/10',
      borderColor: 'border-status-warning'
    }
  };

  const { icon, text, color, bgColor, borderColor } = statusConfig[status];

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className={cn("flex items-center space-x-2 px-2.5 py-1 rounded-full border", 
        color, bgColor, borderColor)}>
        {icon}
        <span className="text-xs font-medium">{text}</span>
      </div>
      
      {status === 'running' && (
        <div className="flex-grow">
          <Progress value={progress} className="h-2 w-full" />
        </div>
      )}
    </div>
  );
}
