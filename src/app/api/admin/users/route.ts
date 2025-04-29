import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export async function GET(request: Request) {
  try {
    // Basic authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Query to get all users
    const users = await executeQuery(`
      SELECT uid, email, name, photo_url as photoURL, created_at as createdAt
      FROM Users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch users: ' + error.message },
      { status: 500 }
    );
  }
} 