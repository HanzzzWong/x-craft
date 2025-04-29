'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import SplashScreen from './splash';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Show splash for 2 seconds and then redirect
    const timer = setTimeout(() => {
      setShowSplash(false);
      
      // Navigate based on authentication status
      if (user) {
        // User is logged in, go to home page
        router.push('/home');
      } else {
        // Not logged in, go to login page
        router.push('/auth/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, user]);

  // If still loading auth state, continue showing splash screen
  if (loading || showSplash) {
    return <SplashScreen />;
  }

  // This should never be rendered as we redirect in the useEffect
  return null;
}

