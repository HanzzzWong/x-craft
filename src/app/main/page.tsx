'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import MainApp from '../main-app';

export default function MainPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // Don't render anything while checking auth
  }

  return <MainApp />;
} 