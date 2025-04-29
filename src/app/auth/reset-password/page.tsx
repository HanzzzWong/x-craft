'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Get token from URL parameters
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Missing reset token in URL');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError('Missing reset token');
      return;
    }
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Password validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    
    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number');
      return;
    }
    
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain at least one special character');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setIsSuccess(true);
      
      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully.",
      });
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      setError(error.message || "Failed to reset password. Please try again.");
      
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Failed to reset password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-800">Reset your password</CardTitle>
          <CardDescription className="text-center">
            Create a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>Password reset successful</AlertTitle>
                <AlertDescription>
                  Your password has been reset successfully. You can now log in with your new password.
                </AlertDescription>
              </Alert>
              
              <div className="text-center">
                <Button 
                  onClick={() => router.push('/auth/login')}
                  className="bg-green-700 hover:bg-green-800"
                >
                  Go to login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Password must:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Be at least 8 characters long</li>
                  <li>Include at least one uppercase letter</li>
                  <li>Include at least one lowercase letter</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-green-700 hover:bg-green-800"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                  </>
                ) : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
        
        {!isSuccess && (
          <CardFooter className="flex flex-col">
            <div className="text-sm text-center text-muted-foreground mt-2">
              <Link 
                href="/auth/forgot-password" 
                className="text-green-600 hover:text-green-800 font-medium"
              >
                Request a new reset link
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 