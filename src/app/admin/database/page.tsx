'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

interface DbStatus {
  connected: boolean;
  error?: string;
  environment?: {
    database: string;
    server: string;
    hasUserSet: boolean;
    hasPasswordSet: boolean;
  };
  schema?: {
    usersTableExists: boolean;
    userColumns: Array<{name: string, type: string}>;
    userCount: number;
  };
}

export default function DatabaseStatusPage() {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const checkDatabase = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          toast({
            variant: "destructive",
            title: "Authentication error",
            description: "You need to be logged in to view this page.",
          });
          router.push('/auth/login');
          return;
        }
        
        // Check database status
        const response = await fetch('/api/system/db-check');
        
        if (response.ok) {
          const data = await response.json();
          setDbStatus(data);
        } else {
          const error = await response.json();
          setDbStatus({
            connected: false,
            error: error.error || 'Failed to check database'
          });
          toast({
            variant: "destructive",
            title: "Error checking database",
            description: error.error || "Failed to check database",
          });
        }
      } catch (error: any) {
        console.error('Error checking database:', error);
        setDbStatus({
          connected: false,
          error: error.message || 'Unknown error'
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred while checking the database",
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkDatabase();
  }, [user, router, toast]);

  const refreshStatus = () => {
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
            <CardDescription>Checking database connection...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Icons.loader className="h-8 w-8 animate-spin text-green-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardTitle className="text-2xl text-white">Database Status</CardTitle>
          <CardDescription className="text-green-100">
            Current database connection and configuration information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Status: {" "}
              <span className={dbStatus?.connected ? "text-green-600" : "text-red-600"}>
                {dbStatus?.connected ? "Connected" : "Disconnected"}
              </span>
            </h2>
            <Button 
              onClick={refreshStatus}
              className="bg-green-600 hover:bg-green-700 hover:shadow-md transition-all hover:scale-105"
            >
              <Icons.refresh className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
          
          {dbStatus?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              <h3 className="font-medium">Error:</h3>
              <p>{dbStatus.error}</p>
            </div>
          )}
          
          {dbStatus?.environment && (
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Environment Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Database:</p>
                  <p className="font-medium">{dbStatus.environment.database}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Server:</p>
                  <p className="font-medium">{dbStatus.environment.server}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User Configured:</p>
                  <p className="font-medium">{dbStatus.environment.hasUserSet ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Password Configured:</p>
                  <p className="font-medium">{dbStatus.environment.hasPasswordSet ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}
          
          {dbStatus?.schema && (
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Database Schema</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">Users Table:</p>
                <p className="font-medium">{dbStatus.schema.usersTableExists ? "Exists" : "Missing"}</p>
              </div>
              
              {dbStatus.schema.usersTableExists && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">User Count:</p>
                    <p className="font-medium">{dbStatus.schema.userCount}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Table Columns:</p>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-md">
                      <div className="font-medium text-green-800">Column Name</div>
                      <div className="font-medium text-green-800">Data Type</div>
                      {dbStatus.schema.userColumns.map((col, index) => (
                        <>
                          <div key={`name-${index}`} className="text-sm">{col.name}</div>
                          <div key={`type-${index}`} className="text-sm text-gray-600">{col.type}</div>
                        </>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 