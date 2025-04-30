
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully."
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <>
      <Header 
        title="Settings" 
        description="Configure your RAPIDS tools and environment"
      />
      
      <div className="space-y-10">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Spark Environment</h3>
            <p className="text-sm text-muted-foreground">
              Configure your Apache Spark environment settings.
            </p>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="spark-home">Spark Home</Label>
              <Input 
                id="spark-home" 
                placeholder="/path/to/spark" 
                defaultValue="/usr/local/spark"
              />
              <p className="text-xs text-muted-foreground">
                Path to your Spark installation directory.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spark-version">Spark Version</Label>
              <Input 
                id="spark-version" 
                placeholder="3.3.2" 
                defaultValue="3.3.2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="java-home">Java Home</Label>
              <Input 
                id="java-home" 
                placeholder="/path/to/java" 
                defaultValue="/usr/lib/jvm/java-8-openjdk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-log-dir">Event Log Directory</Label>
              <Input 
                id="event-log-dir" 
                placeholder="/path/to/event/logs" 
                defaultValue="/var/log/spark/events"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="default-configs">Default Spark Configurations</Label>
              <Textarea 
                id="default-configs" 
                placeholder="spark.executor.memory=4g
spark.executor.cores=2"
                defaultValue="spark.executor.memory=4g
spark.executor.cores=2
spark.driver.memory=2g
spark.sql.shuffle.partitions=200"
                rows={4}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">RAPIDS Accelerator</h3>
            <p className="text-sm text-muted-foreground">
              Configure the RAPIDS Accelerator for Apache Spark.
            </p>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rapids-home">RAPIDS Home</Label>
              <Input 
                id="rapids-home" 
                placeholder="/path/to/rapids" 
                defaultValue="/opt/rapids"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rapids-jar">RAPIDS JAR Path</Label>
              <Input 
                id="rapids-jar" 
                placeholder="/path/to/rapids-4-spark.jar" 
                defaultValue="/opt/rapids/rapids-4-spark_2.12-23.12.0.jar"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-rapids">Enable RAPIDS by default</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically enable the RAPIDS Accelerator for all compatible jobs.
                </p>
              </div>
              <Switch id="enable-rapids" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-ucx">Enable UCX Transport</Label>
                <p className="text-sm text-muted-foreground">
                  Use UCX for GPU data transfer (recommended for multi-GPU setups).
                </p>
              </div>
              <Switch id="enable-ucx" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="collect-metrics">Collect Performance Metrics</Label>
                <p className="text-sm text-muted-foreground">
                  Gather detailed metrics for all RAPIDS accelerated jobs.
                </p>
              </div>
              <Switch id="collect-metrics" defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">User Interface</h3>
            <p className="text-sm text-muted-foreground">
              Customize the RAPIDS UI settings.
            </p>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-refresh">Auto-refresh Dashboards</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh job status and metrics.
                </p>
              </div>
              <Switch id="auto-refresh" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="job-notifications">Job Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications when jobs complete or fail.
                </p>
              </div>
              <Switch id="job-notifications" defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </>
  );
}
