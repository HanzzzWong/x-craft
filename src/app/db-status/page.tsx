'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface DatabaseStatus {
  success: boolean;
  message: string;
  dbStatus: string;
  tables?: number;
  error?: string;
}

export default function DatabaseStatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/db-check');
      const data = await response.json();
      setStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking database:', error);
      setStatus({
        success: false,
        message: 'Failed to check database connection',
        dbStatus: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <header className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/home')}
          className="mb-4"
        >
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-green-800">Database Status</h1>
        <p className="text-green-600 mt-2">Check the status of your Microsoft SQL Server connection</p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl text-green-800">Connection Status</CardTitle>
          <CardDescription>
            Current status of your SQL Server database connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status ? (
            <>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${status.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-lg font-medium">
                  {status.success ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <Alert variant={status.success ? "default" : "destructive"}>
                <AlertTitle>{status.message}</AlertTitle>
                <AlertDescription>
                  {status.success ? (
                    `Your application is successfully connected to the SQL Server database. There are ${status.tables} tables available.`
                  ) : (
                    `Connection Error: ${status.error}`
                  )}
                </AlertDescription>
              </Alert>

              {lastChecked && (
                <p className="text-sm text-gray-500">
                  Last checked: {lastChecked.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center py-8">
              <Icons.loader className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={checkDatabaseConnection} 
            disabled={isLoading}
            className="bg-green-700 hover:bg-green-800"
          >
            {isLoading ? (
              <>
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Checking...
              </>
            ) : (
              <>
                <Icons.loader className="mr-2 h-4 w-4" /> Check Connection
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-green-800">How to Check Your Database</CardTitle>
          <CardDescription>
            Instructions for manually checking your SQL Server database connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Check from SQL Server Management Studio (SSMS)</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Open SSMS and connect to your server (103.75.189.196)</li>
              <li>Go to your database "Hanz" in the Object Explorer</li>
              <li>Right-click on the database and select "Properties" to see its details</li>
              <li>To see tables, expand the database → Tables folder</li>
            </ol>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">Database Connection Configuration</h3>
            <p className="mb-4">These are the settings currently configured for your database connection:</p>
            <code className="block bg-gray-100 p-3 rounded-md text-sm">
              MSSQL_USER=wh<br/>
              MSSQL_PASSWORD=************<br/>
              MSSQL_SERVER=103.75.189.196<br/>
              MSSQL_DATABASE=Hanz
            </code>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-2">Check for Tables in SQL Server</h3>
            <p className="mb-2">Execute this query in SSMS to see all tables in your database:</p>
            <code className="block bg-gray-100 p-3 rounded-md text-sm">
              SELECT * FROM Hanz.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 