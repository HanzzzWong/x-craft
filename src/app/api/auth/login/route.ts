import { NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { executeQuery } from '@/lib/database';

export async function POST(request: Request) {
  try {
    console.log('Login API endpoint called');
    
    // Check database connection first
    try {
      console.log('Testing database connection before login');
      const testQuery = await executeQuery<{ status: string }>('SELECT \'connected\' as status');
      console.log('Database connection successful:', testQuery[0]?.status);
    } catch (dbError) {
      console.error('Database connection failed during login:', dbError);
      return NextResponse.json(
        { error: 'Database connection issue. Please try again later.' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
      console.log('Login rejected: Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Check if Users table exists
    try {
      const usersTableExists = await executeQuery<{ exists: number }>(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
          SELECT 1 as exists
        ELSE
          SELECT 0 as exists
      `);
      
      if (!usersTableExists[0]?.exists) {
        console.error('Login failed: Users table does not exist');
        return NextResponse.json(
          { error: 'Authentication system not properly initialized' },
          { status: 500 }
        );
      }
      
      // Check if the user exists first
      const userCheck = await executeQuery<{ userExists: number }>(`
        SELECT COUNT(*) as userExists FROM Users WHERE email = @email
      `, { email });
      
      if (!userCheck[0]?.userExists) {
        console.log(`Login failed: No user found with email ${email}`);
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } catch (tableError) {
      console.error('Error checking Users table:', tableError);
    }
    
    // Attempt to sign in the user
    try {
      console.log('Calling signIn function');
      const result = await signIn(email, password);
      console.log('Login successful for:', email);
      return NextResponse.json(result);
    } catch (signInError: any) {
      console.error('Login error from signIn function:', signInError);
      
      return NextResponse.json(
        { error: signInError.message || 'Authentication failed' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected login error:', error);
    
    return NextResponse.json(
      { error: 'Login failed: Server error', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 