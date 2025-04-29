import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  return response;
}

// Only run the middleware on server-specific routes
export const config = {
  matcher: [
    /*
     * Match all API routes except static files
     * and other client-side only paths
     */
    '/api/:path*',
  ],
};

// Export an empty object for "server-only" marking
export const serverSideContext = {}; 