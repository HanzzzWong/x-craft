'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Icons } from '@/components/icons';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="bg-gradient-to-r from-green-50 to-white border-b border-green-200 px-4 py-3 shadow-sm">
      <div className="container flex flex-wrap justify-between items-center mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image 
              src="/X.png" 
              alt="X-Craft Logo" 
              fill 
              className="object-contain" 
              priority
            />
          </div>
        </Link>
        
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          type="button"
          className="inline-flex items-center p-2 ml-3 text-sm text-gray-500 rounded-lg md:hidden hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-200"
        >
          <span className="sr-only">Open main menu</span>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
          </svg>
        </button>
        
        {/* Desktop navbar links */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} w-full md:block md:w-auto`}>
          <ul className="flex flex-col mt-4 md:flex-row md:items-center md:space-x-6 md:mt-0 md:text-sm md:font-medium">
            <li>
              <Link href="/" className={`block py-2 pr-4 pl-3 ${pathname === '/' ? 'text-green-600 font-bold' : 'text-gray-700'} rounded md:bg-transparent md:p-0 hover:text-green-500 transition-colors`}>
                Home
              </Link>
            </li>
            
            {user ? (
              <>
                <li>
                  <Link href="/main-app" className={`block py-2 pr-4 pl-3 ${pathname === '/main-app' ? 'text-green-600 font-bold' : 'text-gray-700'} rounded md:bg-transparent md:p-0 hover:text-green-500 transition-colors`}>
                    New Project
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className={`block py-2 pr-4 pl-3 ${pathname === '/profile' ? 'text-green-600 font-bold' : 'text-gray-700'} rounded md:bg-transparent md:p-0 hover:text-green-500 transition-colors md:hidden`}>
                    My Profile
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="block py-2 pr-4 pl-3 text-gray-700 hover:text-green-600 rounded md:bg-transparent md:p-0 transition-colors"
                  >
                    Logout
                  </button>
                </li>
                <li className="hidden md:block">
                  <Link href="/profile">
                    <Button
                      variant="outline"
                      className="bg-white/80 backdrop-blur-sm text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <Icons.user className="mr-2 h-4 w-4" />
                      My Profile
                    </Button>
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className={`block py-2 pr-4 pl-3 ${pathname === '/login' ? 'text-green-600 font-bold' : 'text-gray-700'} rounded md:bg-transparent md:p-0 hover:text-green-500 transition-colors`}>
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/register" className={`block py-2 pr-4 pl-3 ${pathname === '/register' ? 'text-green-600 font-bold' : 'text-gray-700'} rounded md:bg-transparent md:p-0 hover:text-green-500 transition-colors`}>
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
} 