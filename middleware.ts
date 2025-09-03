import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define allowed origins based on environment
const getAllowedOrigins = () => {
  const allowedOrigins: string[] = [];

  // Always allow production domains
  allowedOrigins.push(
    'https://domica.vercel.app',
    'https://domica-git-scrape-facebook-etanheys-projects.vercel.app'
  );

  // Allow Facebook domains for Chrome extension
  allowedOrigins.push(
    'https://www.facebook.com',
    'https://facebook.com',
    'http://www.facebook.com',
    'http://facebook.com'
  );

  // In development, also allow localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }

  return allowedOrigins;
};

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();

    // Get the origin from the request
    const origin = request.headers.get('origin');
    const allowedOrigins = getAllowedOrigins();

    // Check if the origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow requests with no origin (e.g., server-to-server, Postman)
      // This is safe because CORS is a browser protection
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    // If origin exists but is not allowed, don't set CORS headers (request will be blocked)

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
