import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserProfile as getProfileFromDb, updateUserProfile } from '@/lib/projects';

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
    console.log('Verifying token...');
    
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

// GET user profile
export async function GET(request: Request) {
  try {
    console.log('User profile request received');
    
    // Verify authorization
    const decoded = await verifyToken(request);
    const userId = decoded.uid;
    
    console.log('Token verified for user ID:', userId);
    
    // Get user profile
    const userProfile = await getProfileFromDb(userId);
    
    if (!userProfile) {
      console.log('User profile not found for ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user profile
    console.log('Returning user profile for ID:', userId);
    return NextResponse.json({
      user: {
        uid: userProfile.uid,
        email: userProfile.email,
        name: userProfile.name,
        photoURL: userProfile.photoURL,
        createdAt: userProfile.createdAt,
        userType: userProfile.userType
      }
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(request: Request) {
  try {
    console.log('Update user profile request received');
    
    // Verify authorization
    const decoded = await verifyToken(request);
    const userId = decoded.uid;
    
    console.log('Token verified for user ID:', userId);
    
    // Get request body
    const profileData = await request.json();
    console.log('Profile update data:', profileData);
    
    // Update user profile in the database
    const updatedUser = await updateUserProfile(userId, profileData);
    
    if (!updatedUser) {
      console.error('Failed to update user profile for ID:', userId);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }
    
    console.log('User profile updated successfully for ID:', userId);
    return NextResponse.json({
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 