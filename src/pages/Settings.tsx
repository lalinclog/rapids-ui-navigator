
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Terminal } from 'lucide-react';
import { PythonService } from '@/services/PythonService';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const [pythonStatus, setPythonStatus] = useState<'checking' | 'not-setup' | 'ready'>('checking');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPythonEnvironment();
  }, []);

  const checkPythonEnvironment = async () => {
    setPythonStatus('checking');
    const isSetup = await PythonService.checkPythonEnv();
    setPythonStatus(isSetup ? 'ready' : 'not-setup');
  };

  const setupPythonEnvironment = async () => {
    setIsSettingUp(true);
    try {
      const result = await PythonService.setupPythonEnv();
      
      if (result.success) {
        toast({
          title: "Environment Setup Complete",
          description: "Python environment with spark-rapids-user-tools is ready to use",
        });
        setPythonStatus('ready');
      } else {
        toast({
          variant: "destructive",
          title: "Setup Failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Setup Error",
        description: "An unexpected error occurred during setup",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <>
      <Header 
        title="Settings" 
        description="Configure your RAPIDS Accelerator for Spark environment"
      />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Python Environment
            </CardTitle>
            <CardDescription>
              Setup Python environment with spark-rapids-user-tools for RAPIDS Accelerator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pythonStatus === 'checking' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Checking environment...</AlertTitle>
                <AlertDescription>
                  Verifying if Python environment is set up correctly
                </AlertDescription>
              </Alert>
            )}
            
            {pythonStatus === 'not-setup' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Python Environment Not Detected</AlertTitle>
                <AlertDescription>
                  To use the RAPIDS tools, you need to set up a Python environment with spark-rapids-user-tools.
                  Click the button below to create a virtual environment and install the required packages.
                </AlertDescription>
              </Alert>
            )}
            
            {pythonStatus === 'ready' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Python Environment Ready</AlertTitle>
                <AlertDescription>
                  Python environment is configured correctly with spark-rapids-user-tools.
                  You can now use the Qualification and Profiling tools.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            {pythonStatus === 'not-setup' && (
              <Button 
                onClick={setupPythonEnvironment} 
                disabled={isSettingUp}
              >
                {isSettingUp ? "Setting Up Environment..." : "Setup Python Environment"}
              </Button>
            )}
            
            {pythonStatus === 'ready' && (
              <Button variant="outline" onClick={checkPythonEnvironment}>
                Verify Environment
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Docker Environment
            </CardTitle>
            <CardDescription>
              Information about the Docker environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Services</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li className="text-sm">
                    <span className="font-medium">MinIO:</span> Object storage for Spark event logs and outputs (Port 9000, Console: 9001)
                  </li>
                  <li className="text-sm">
                    <span className="font-medium">PostgreSQL:</span> Metadata storage for jobs and results (Port 5432)
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Connection Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">MinIO Console</p>
                    <p className="text-muted-foreground">http://localhost:9001</p>
                  </div>
                  <div>
                    <p className="font-medium">MinIO Credentials</p>
                    <p className="text-muted-foreground">User: minioadmin<br/>Password: minioadmin</p>
                  </div>
                  <div>
                    <p className="font-medium">PostgreSQL Connection</p>
                    <p className="text-muted-foreground">Host: localhost<br/>Port: 5432</p>
                  </div>
                  <div>
                    <p className="font-medium">PostgreSQL Credentials</p>
                    <p className="text-muted-foreground">User: postgres<br/>Password: postgres<br/>Database: spark_rapids</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
