import { NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth';

// POST request to reset password with token
export async function POST(request: Request) {
  try {
    console.log('Password reset submission received');
    
    // Get token and new password from request body
    const { token, newPassword } = await request.json();
    
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }
    
    // Reset the password
    const success = await resetPassword(token, newPassword);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 400 }
      );
    }
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    // Handle specific error cases
    if (error.message === 'Invalid or expired reset token') {
      return NextResponse.json(
        { error: 'The password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }
    
    if (error.message === 'Reset token has expired') {
      return NextResponse.json(
        { error: 'The password reset link has expired. Please request a new one.' },
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
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 