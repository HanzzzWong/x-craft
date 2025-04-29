'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { login, register, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Check for environment variables on mount
  useEffect(() => {
    // In a real app, you might check for required environment variables
    // This is optional for this example
  }, []);

  // Add a useEffect to check if the user is already logged in and redirect to home page
  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // If we have a token, check if the user data is loaded
          if (user) {
            // User is already logged in, redirect to home page
            console.log('User already authenticated, redirecting to home page');
            router.push('/home');
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
      }
    };

    if (!isLoading) {
      checkAuth();
    }
  }, [router, user, isLoading]);

  const createTestAccount = async () => {
    setIsLoading(true);
    
    const testEmail = "test@example.com";
    const testPassword = "password123";
    
    try {
      // Try to register a test account
      await register(testEmail, testPassword, "Test User");
      
      toast({
        title: "Test account created",
        description: "Successfully created a test account and logged in.",
      });
      
      // Redirect to home page
      router.push('/home');
      
    } catch (error: any) {
      console.error("Error creating test account:", error);
      
      let errorMessage = "Error creating test account.";
      
      // User may already exist, try to login instead
      try {
        if (error.message.includes('already exists')) {
          await login(testEmail, testPassword);
          
          toast({
            title: "Test account login",
            description: "Successfully logged in with test account.",
          });
          
          // Redirect to home page
          router.push('/home');
          return;
        }
      } catch (loginError) {
        console.error("Error logging in with test account:", loginError);
      }
      
      // Auto-fill the form
      setEmail(testEmail);
      setPassword(testPassword);
      
      toast({
        variant: "destructive",
        title: "Test account setup",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter your email and password.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(email, password);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      // Use a setTimeout to ensure the UI updates before navigation
      setTimeout(() => {
        router.push('/home');
      }, 500);
      
    } catch (error: any) {
      // Handle auth errors with specific error message from server
      let errorMessage = error.message || "Please check your credentials and try again.";
      
      console.error("Login error:", error);
      
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      {configError && (
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            {configError}
            <p className="mt-2 text-sm">
              Please check your .env.local file and ensure all credentials are properly set.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-800">Sign in to your account</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-green-700 hover:bg-green-800"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Please wait
                </>
              ) : "Sign In"}
            </Button>
          </form>
          
          {/* Temporary debugging button */}
          <div className="pt-2">
            <Button 
              type="button" 
              variant="outline"
              className="w-full text-gray-500 border-gray-300 hover:bg-gray-100"
              onClick={createTestAccount}
              disabled={isLoading}
            >
              Create Test Account
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-center text-muted-foreground mt-2">
            Don&apos;t have an account?{" "}
            <Link 
              href="/auth/register" 
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 