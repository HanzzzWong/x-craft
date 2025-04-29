'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(''); // For development only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter your email address.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }
      
      // For development only, store the token
      if (data.development) {
        setResetToken(data.development.resetToken);
      }
      
      setIsSubmitted(true);
      
      toast({
        title: "Request submitted",
        description: "If an account exists with this email, you will receive password reset instructions.",
      });
      
    } catch (error: any) {
      console.error("Password reset request error:", error);
      
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error.message || "Failed to send password reset request. Please try again.",
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
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSubmitted ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  We've sent password reset instructions to your email address. Please check your inbox.
                </AlertDescription>
              </Alert>
              
              {/* Development only - display token */}
              {resetToken && (
                <div className="p-3 border border-yellow-300 bg-yellow-50 rounded">
                  <p className="text-sm font-medium text-yellow-800">Development Only</p>
                  <p className="text-xs mt-1">Reset Token: {resetToken}</p>
                  <Link href={`/auth/reset-password?token=${resetToken}`} className="text-xs text-blue-600 hover:underline mt-1 block">
                    Click here to reset password
                  </Link>
                </div>
              )}
              
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => router.push('/auth/login')}
                  className="text-green-600 hover:text-green-800"
                >
                  Back to login
                </Button>
              </div>
            </div>
          ) : (
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
              
              <Button 
                type="submit" 
                className="w-full bg-green-700 hover:bg-green-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
        
        {!isSubmitted && (
          <CardFooter className="flex flex-col">
            <div className="text-sm text-center text-muted-foreground mt-2">
              Remember your password?{" "}
              <Link 
                href="/auth/login" 
                className="text-green-600 hover:text-green-800 font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 