import '@/app/globals.css';
import { Inter } from 'next/font/google';
import ClientLayout from '@/components/client-layout';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

// Export metadata for Next.js
export const metadata: Metadata = {
  title: 'X-Craft',
  description: 'Recycling crafts application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
