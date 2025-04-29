'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { Navbar } from '@/components/ui/navbar';
import { Toaster } from '@/components/ui/toaster';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure required directories exist
  useEffect(() => {
    const ensureDirectories = async () => {
      try {
        const response = await fetch('/api/system/ensure-directories');
        if (response.ok) {
          console.log('Directories verified successfully');
        } else {
          console.error('Failed to verify directories');
        }
      } catch (error) {
        console.error('Error checking directories:', error);
      }
    };

    ensureDirectories();
  }, []);

  return (
    <AuthProvider>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <Toaster />
    </AuthProvider>
  );
} 