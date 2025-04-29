import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserProfile } from '@/lib/projects';

// JWT secret key for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
    
    // Get the user profile
    const userProfile = await getUserProfile(decoded.uid);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return the user profile (excluding the password)
    return NextResponse.json({
      uid: userProfile.uid,
      email: userProfile.email,
      name: userProfile.name,
      photoURL: userProfile.photoURL,
      createdAt: userProfile.createdAt
    });
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 