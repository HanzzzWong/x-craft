import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { changePassword } from '@/lib/auth';

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

// POST change password
export async function POST(request: Request) {
  try {
    console.log('Change password request received');
    
    // Verify authorization
    const decoded = await verifyToken(request);
    const userId = decoded.uid;
    
    console.log('Token verified for user ID:', userId);
    
    // Get request body
    const { currentPassword, newPassword } = await request.json();
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Call the changePassword function
    await changePassword(userId, currentPassword, newPassword);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    // Handle specific error cases
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    if (error.message === 'Current password is incorrect') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error.message.includes('Password must')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
} 