
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Eye, DownloadCloud } from 'lucide-react';
import { JobStatus } from './JobStatus';

export type Job = {
  id: string;
  name: string;
  type: 'qualification' | 'profiling';
  status: 'completed' | 'running' | 'failed' | 'pending' | 'warning';
  progress?: number;
  startTime: Date;
  endTime?: Date;
  user: string;
};

interface JobCardProps {
  job: Job;
  onView: (job: Job) => void;
}

export function JobCard({ job, onView }: JobCardProps) {
  const { name, type, status, progress, startTime, endTime, user } = job;

  const duration = endTime 
    ? formatDistanceToNow(new Date(endTime), { addSuffix: false })
    : "In progress";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {type === 'qualification' ? 'Qualification Tool' : 'Profiling Tool'}
            </p>
          </div>
          <JobStatus status={status} progress={progress} />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-xs text-muted-foreground">Start Time</p>
            <p className="text-sm font-medium mt-0.5">
              {startTime.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium mt-0.5">{duration}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">User</p>
            <p className="text-sm font-medium mt-0.5">{user}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-6 py-4 bg-muted/30 border-t">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-sm"
            onClick={() => onView(job)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Results
          </Button>
          {status === 'completed' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
            >
              <DownloadCloud className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
