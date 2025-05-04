
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Terminal, Loader2, Package, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { PythonService } from '@/services/PythonService';
import { useToast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';

interface PackageInfo {
  name: string;
  version: string;
}

export default function Settings() {
  const [pythonStatus, setPythonStatus] = useState<'checking' | 'not-setup' | 'ready'>('checking');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [pythonVersion, setPythonVersion] = useState<string>('');
  const [pythonPaths, setPythonPaths] = useState<string[]>([]);
  const [rapidsPath, setRapidsPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const getInstalledPackages = async () => {
    if (packagesOpen && packages.length > 0) {
      setPackagesOpen(false);
      return;
    }

    setIsLoadingPackages(true);
    try {
      const result = await PythonService.getInstalledPackages();
      
      if (result.success) {
        setPackages(result.packages);
        setPythonVersion(result.pythonVersion);
        setPythonPaths(result.pythonPath || []);
        setRapidsPath(result.rapidsPath || null);
        setPackagesOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Packages",
          description: result.message || "Could not retrieve installed packages",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while retrieving packages",
      });
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const filteredPackages = searchTerm 
    ? packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        pkg.version.includes(searchTerm)
      )
    : packages;

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

            <Collapsible 
              open={packagesOpen} 
              onOpenChange={setPackagesOpen}
              className="mt-4 border rounded-md"
            >
              <div className="border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">Installed Python Packages</span>
                </div>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={!packages.length ? getInstalledPackages : undefined}
                    disabled={isLoadingPackages}
                  >
                    {isLoadingPackages ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : packagesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="p-4 space-y-4">
                  {pythonVersion && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Python Version</h3>
                      <div className="text-sm p-2 bg-muted rounded-md">{pythonVersion}</div>
                    </div>
                  )}

                  {rapidsPath !== undefined && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">RAPIDS Path</h3>
                      <div className="text-sm p-2 bg-muted rounded-md">
                        {rapidsPath || "Not found in Python path"}
                      </div>
                    </div>
                  )}

                  {pythonPaths.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Python Path</h3>
                      <div className="text-sm p-2 bg-muted rounded-md max-h-32 overflow-y-auto">
                        {pythonPaths.map((path, i) => (
                          <div key={i} className="mb-1">{path}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center mb-2">
                      <h3 className="text-sm font-medium mr-2">Installed Packages</h3>
                      <div className="flex-1 ml-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search packages..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto border rounded-md">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Package
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Version
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {filteredPackages.length > 0 ? (
                            filteredPackages.map((pkg, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium">{pkg.name}</td>
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-muted-foreground">{pkg.version}</td>
                              </tr>
                            ))
                          ) : searchTerm ? (
                            <tr>
                              <td colSpan={2} className="px-6 py-4 text-sm text-center text-muted-foreground">
                                No packages matching "{searchTerm}"
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-6 py-4 text-sm text-center text-muted-foreground">
                                No packages found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
          <CardFooter className="flex justify-between">
            {pythonStatus === 'not-setup' && (
              <Button 
                onClick={setupPythonEnvironment} 
                disabled={isSettingUp}
              >
                {isSettingUp ? "Setting Up Environment..." : "Setup Python Environment"}
              </Button>
            )}
            
            {pythonStatus === 'ready' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={checkPythonEnvironment}>
                  Verify Environment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={getInstalledPackages}
                  disabled={isLoadingPackages}
                >
                  {isLoadingPackages ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Packages...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      {packagesOpen ? "Hide" : "Show"} Installed Packages
                    </>
                  )}
                </Button>
              </div>
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
