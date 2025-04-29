import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { deleteAccount } from '@/lib/auth';

// JWT secret key for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Verify JWT token from authorization header
async function verifyToken(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      throw new Error('Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Try both formats: {uid: string} and {userId: string}
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { uid?: string; userId?: string };
      const userId = decoded.uid || decoded.userId;
      
      if (!userId) {
        console.error('Token does not contain uid or userId');
        throw new Error('Invalid token format');
      }
      
      console.log('Token verified successfully for user:', userId);
      return { uid: userId };
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      throw new Error('Invalid or expired token');
    }
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
}

// POST delete account
export async function POST(request: Request) {
  try {
    console.log('Delete account request received');
    
    // Verify authorization
    const decoded = await verifyToken(request);
    const userId = decoded.uid;
    
    console.log('Token verified for user ID:', userId);
    
    // Get request body
    const { password } = await request.json();
    
    // Validate inputs
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }
    
    // Call the deleteAccount function
    await deleteAccount(userId, password);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    
    // Handle specific error cases
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    if (error.message === 'Incorrect password') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error.message === 'User not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
} 