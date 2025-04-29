import { NextResponse } from 'next/server';
import { generatePasswordResetToken } from '@/lib/auth';
// We'll implement email sending later
// import { sendPasswordResetEmail } from '@/lib/email';

// POST request to initiate password reset
export async function POST(request: Request) {
  try {
    console.log('Password reset request received');
    
    // Get email from request body
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Generate reset token
    const resetData = await generatePasswordResetToken(email);
    
    // If email doesn't exist, we return success anyway to prevent email enumeration
    if (!resetData) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ success: true });
    }
    
    // In a production app, you'd send an email with the reset link
    // For now, we'll just return the token in the response (ONLY FOR DEVELOPMENT)
    const resetToken = resetData.token;
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
    
    // For development only, return the token and URL
    console.log(`Reset URL for ${email}: ${resetUrl}`);
    
    // Return success
    return NextResponse.json({ 
      success: true,
      // Only include these fields in development
      development: {
        resetToken,
        resetUrl
      }
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 