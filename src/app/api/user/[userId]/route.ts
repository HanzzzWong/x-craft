import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserProfile, updateUserProfile } from '@/lib/projects';

// JWT secret key for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware to verify authorization
async function verifyToken(request: Request, userId: string) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required');
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
  
  // Only allow users to access their own profile
  if (decoded.uid !== userId) {
    throw new Error('Unauthorized access');
  }
  
  return decoded;
}

// GET user profile
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Make sure params is awaited before using its properties
    const userId = params.userId;
    console.log('User profile request received for ID:', userId);
    
    // Verify authorization
    await verifyToken(request, userId);
    
    // Get user profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      console.log('User profile not found for ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user profile (excluding password)
    console.log('Returning user profile for ID:', userId);
    return NextResponse.json({
      user: {
        uid: userProfile.uid,
        email: userProfile.email,
        name: userProfile.name,
        photoURL: userProfile.photoURL,
        createdAt: userProfile.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Unauthorized access') {
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
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Make sure params is awaited before using its properties
    const userId = params.userId;
    console.log('Update user profile request received for ID:', userId);
    
    // Verify authorization
    await verifyToken(request, userId);
    
    // Get request body
    const profileData = await request.json();
    
    // Update user profile
    const result = await updateUserProfile(userId, profileData);
    
    console.log('User profile updated for ID:', userId);
    return NextResponse.json({
      user: result
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