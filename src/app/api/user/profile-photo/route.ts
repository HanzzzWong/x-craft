import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { executeQuery } from '@/lib/database';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// JWT secret key for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      // Verify the token
      decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get the user ID from the token
    const userId = decoded.uid;
    
    // Process the uploaded file
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No photo uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported types: JPEG, PNG, WebP, and GIF' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Create directories if they don't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${uuidv4()}.${fileExt}`;
    const filePath = join(uploadDir, fileName);
    
    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Save the file to the uploads directory
    await writeFile(filePath, Buffer.from(fileBuffer));
    
    // Update the user's profile with the photo URL
    const photoURL = `/uploads/${fileName}`;
    
    await executeQuery(
      'UPDATE Users SET photo_url = @photoURL WHERE uid = @userId',
      { photoURL, userId }
    );
    
    return NextResponse.json({ 
      success: true, 
      photoURL
    });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    
    return NextResponse.json(
      { error: 'Failed to upload profile photo: ' + error.message },
      { status: 500 }
    );
  }
} 