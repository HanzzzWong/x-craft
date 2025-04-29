'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to login page if user is not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // Don't render anything while checking auth
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <header className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/home')}
          className="mb-4"
        >
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-green-800">Community Hub</h1>
        <p className="text-green-600 mt-2">Connect with eco-conscious creators and share your projects</p>
      </header>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              The Community Hub is under development and will be available soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              We're working hard to build a place where you can share your projects, 
              get inspired by others, and connect with like-minded eco-craft enthusiasts.
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex flex-col space-y-2 w-full">
              <h3 className="font-medium">Features coming soon:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
                <li>Project sharing and showcases</li>
                <li>Community challenges and events</li>
                <li>Sustainability tips and tricks</li>
                <li>Material exchange network</li>
                <li>DIY troubleshooting forums</li>
              </ul>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-green-800 mb-4">Want to Help Build the Community?</h2>
          <p className="text-gray-700 mb-4">
            We'd love to hear your ideas for the Community Hub! What features would you like to see?
            How would you use this space? Your feedback will help shape this platform.
          </p>
          <Button className="bg-green-700 hover:bg-green-800">
            <Icons.mail className="mr-2 h-4 w-4" />
            Send Feedback
          </Button>
        </div>
      </div>
    </div>
  );
} 