import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { executeQuery } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    console.log('Registration API endpoint called');
    
    // Check database connection first
    try {
      console.log('Testing database connection before registration');
      const testQuery = await executeQuery<{ status: string }>('SELECT \'connected\' as status');
      console.log('Database connection successful:', testQuery[0]?.status);
    } catch (dbError) {
      console.error('Database connection failed during registration:', dbError);
      return NextResponse.json(
        { error: 'Database connection issue. Please try again later.' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { email, password, name } = body;
    
    console.log('Registration request received for:', email);
    
    // Input validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Name length validation
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Check if Users table exists and create it if it doesn't
    try {
      const usersTableExists = await executeQuery<{ exists: number }>(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
          SELECT 1 as exists
        ELSE
          SELECT 0 as exists
      `);
      
      if (!usersTableExists[0]?.exists) {
        console.log('Users table does not exist, creating it...');
        
        await executeQuery(`
          CREATE TABLE Users (
            uid VARCHAR(50) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            photo_url VARCHAR(255) NULL,
            user_type VARCHAR(20) DEFAULT 'personal',
            created_at DATETIME NOT NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL
          )
        `);
        
        console.log('Users table created successfully');
      }
      
      // Check if email already exists
      const existingUser = await executeQuery<{ count: number }>(`
        SELECT COUNT(*) as count FROM Users WHERE email = @email
      `, { email });
      
      if (existingUser[0]?.count > 0) {
        console.log('Registration failed: Email already in use', email);
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    } catch (tableError) {
      console.error('Error checking/creating Users table:', tableError);
      return NextResponse.json(
        { error: 'Database error during registration setup. Please try again later.' },
        { status: 500 }
      );
    }
    
    // Create a new user - all password validation happens in createUser
    try {
      // Validate password strength ourselves to provide better errors
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" },
          { status: 400 }
        );
      }
      
      if (!/[A-Z]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one uppercase letter" },
          { status: 400 }
        );
      }
      
      if (!/[a-z]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one lowercase letter" },
          { status: 400 }
        );
      }
      
      if (!/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one number" },
          { status: 400 }
        );
      }
      
      if (!/[^A-Za-z0-9]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one special character" },
          { status: 400 }
        );
      }
      
      // Try to create a user with the provided credentials
      console.log('Calling createUser function');
      const result = await createUser(email, password, name);
      
      // Double-check that we have all expected fields in the result
      if (!result || !result.token || !result.user) {
        console.error('Invalid user creation result:', result);
        return NextResponse.json(
          { error: 'Failed to create user account properly. Missing required data.' },
          { status: 500 }
        );
      }
      
      console.log('User created successfully:', email);
      
      // Return a successful response with proper user and token data
      return NextResponse.json({
        user: {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.name, 
          photoURL: result.user.photoURL,
          createdAt: result.user.createdAt
        },
        token: result.token
      });
      
    } catch (userError: any) {
      console.error('User creation error:', userError.message);
      
      // Try a direct insertion approach if createUser fails
      if (userError.message.includes('Database') || userError.message.includes('schema')) {
        try {
          console.log('Attempting direct user creation as fallback');
          
          // Generate a unique UID
          const uid = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Hash the password
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          // Insert the user directly
          await executeQuery(`
            INSERT INTO Users (uid, email, password, name, photo_url, user_type, created_at)
            VALUES (@uid, @email, @password, @name, @photoURL, @userType, @createdAt)
          `, {
            uid,
            email,
            password: hashedPassword,
            name,
            photoURL: null,
            userType: 'personal',
            createdAt: new Date()
          });
          
          console.log('User created successfully via fallback method:', email);
          
          // Generate a simple JWT token
          const token = require('jsonwebtoken').sign(
            { uid: uid },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
          );
          
          return NextResponse.json({
            user: {
              uid,
              email,
              name,
              photoURL: null,
              createdAt: new Date()
            },
            token
          });
        } catch (fallbackError: any) {
          console.error('Fallback user creation failed:', fallbackError);
          return NextResponse.json(
            { error: 'Registration failed after multiple attempts. Please try again later.' },
            { status: 500 }
          );
        }
      }
      
      // Handle specific errors
      if (userError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      
      if (userError.message.includes('Password')) {
        return NextResponse.json(
          { error: userError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: userError.message || 'User creation failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    return NextResponse.json(
      { error: 'Registration failed: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
} 