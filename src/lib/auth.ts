import './server-only'; // Mark this file as server-only

// Authentication module for SQL Server
import { executeQuery, executeStoredProcedure, initializeDatabase } from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from 'mssql';

// JWT secret key for token generation
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// User interface
export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  createdAt: Date;
  userType?: string;
}

// Authentication context state
let currentUser: User | null = null;

// Event handler functions
const authStateChangedHandlers: ((user: User | null) => void)[] = [];

// Listen for auth state changes
export function onAuthStateChanged(callback: (user: User | null) => void) {
  authStateChangedHandlers.push(callback);
  
  // Immediately call with current user
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    const index = authStateChangedHandlers.indexOf(callback);
    if (index !== -1) {
      authStateChangedHandlers.splice(index, 1);
    }
  };
}

// Notify all subscribed handlers of auth state change
function notifyAuthStateChanged(user: User | null) {
  currentUser = user;
  authStateChangedHandlers.forEach(handler => handler(user));
}

// Create a new user
export async function createUser(email: string, password: string, name: string) {
  try {
    console.log('Starting user creation process for:', email);
    
    // Directly check and create Users table if needed
    // This is more reliable than checking INFORMATION_SCHEMA which can have permission issues
    try {
      console.log('Ensuring Users table exists');
      await executeQuery(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
        BEGIN
          CREATE TABLE Users (
            uid VARCHAR(50) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            photo_url VARCHAR(255) NULL,
            user_type VARCHAR(20) DEFAULT 'personal',
            created_at DATETIME NOT NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL,
            reset_token VARCHAR(100) NULL,
            reset_token_expires DATETIME NULL
          );
          PRINT 'Users table created';
        END
        ELSE
        BEGIN
          PRINT 'Users table already exists';
        END
      `);
    } catch (tableError) {
      console.error('Error ensuring Users table:', tableError);
      // Continue anyway - the table might exist but we don't have schema viewing permissions
    }
    
    // Check if user already exists
    try {
      console.log('Checking if user already exists:', email);
      const existingUsers = await executeQuery<{uid: string}>(`
        SELECT uid FROM Users WHERE email = @email
      `, { email });
      
      if (existingUsers.length > 0) {
        throw new Error("User with this email already exists");
      }
    } catch (checkError) {
      // Catch errors but only rethrow user existence errors
      // If it's a database error, we'll just proceed and the insert will fail if the user exists
      if (checkError.message && checkError.message.includes('already exists')) {
        throw checkError;
      }
      console.warn("Warning during user existence check:", checkError);
    }
    
    // Validate password strength
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(password)) {
      throw new Error("Password must contain at least one number");
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error("Password must contain at least one special character");
    }
    
    // Generate a unique UID for the user
    const uid = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    console.log('Generated UID for new user:', uid);
    
    try {
      // Hash the password with stronger salt (12 rounds instead of 10)
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
    
      // Log password hash creation (without showing the actual hash)
      console.log(`Created password hash for user ${email} (length: ${hashedPassword.length})`);
      
      // Store the user in the database - use direct DB connection to avoid pool issues
      try {
        console.log('Attempting to save user to database');
        
        // Try with executeQuery first
        await executeQuery(`
          INSERT INTO Users (uid, email, password, name, photo_url, created_at, user_type)
          VALUES (@uid, @email, @password, @name, @photoURL, @createdAt, @userType);
        `, {
          uid,
          email,
          password: hashedPassword,
          name,
          photoURL: null,
          createdAt: new Date(),
          userType: 'personal'
        });
        
        console.log('User saved successfully using executeQuery');
      } catch (insertError) {
        console.error('Failed to insert user with executeQuery:', insertError);
        
        // Try direct SQL connection as fallback
        console.log('Attempting direct SQL connection as fallback');
        
        const pool = new sql.ConnectionPool({
          user: process.env.MSSQL_USER || '',
          password: process.env.MSSQL_PASSWORD || '',
          server: process.env.MSSQL_SERVER || '',
          database: process.env.MSSQL_DATABASE || '',
          options: {
            encrypt: true,
            trustServerCertificate: true
          }
        });
        
        await pool.connect();
        const request = new sql.Request(pool);
        
        request.input('uid', sql.VarChar(50), uid);
        request.input('email', sql.VarChar(255), email);
        request.input('password', sql.VarChar(255), hashedPassword);
        request.input('name', sql.VarChar(255), name);
        request.input('photoURL', sql.VarChar(255), null);
        request.input('createdAt', sql.DateTime, new Date());
        request.input('userType', sql.VarChar(20), 'personal');
        
        await request.query(`
          INSERT INTO Users (uid, email, password, name, photo_url, created_at, user_type)
          VALUES (@uid, @email, @password, @name, @photoURL, @createdAt, @userType);
        `);
        
        await pool.close();
        console.log('User saved successfully using direct SQL connection');
      }
      
      // Verify user was saved correctly
      const savedUser = await executeQuery<any>(`
        SELECT uid, email, name, photo_url as photoURL, created_at as createdAt
        FROM Users
        WHERE email = @email
      `, { email });
      
      if (savedUser.length === 0) {
        throw new Error("User creation failed. Please try again.");
      }
      
      // Create user object
      const user = {
        uid,
        email,
        name,
        photoURL: null,
        createdAt: new Date(),
        userType: 'personal'
      };
      
      // Generate JWT token
      const token = jwt.sign({ uid: user.uid }, JWT_SECRET, { expiresIn: '7d' });
      
      // Update auth state
      notifyAuthStateChanged(user);
      
      console.log('User creation successful for:', email);
      return { user, token };
    } catch (dbError) {
      console.error("Database operation error during user creation:", dbError);
      throw new Error("Failed to create user account. Database error.");
    }
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    // Fetch user from database
    const query = `
      SELECT uid, email, password, name, photo_url as photoURL, created_at as createdAt
      FROM Users
      WHERE email = @email;
    `;
    
    const users = await executeQuery<any>(query, { email });
    
    if (users.length === 0) {
      throw new Error("The email or password you entered is incorrect. Please try again.");
    }
    
    const user = users[0];
    
    // Verify password exists in database record
    if (!user.password) {
      console.error("User found but password field is empty:", email);
      throw new Error("Account data error. Please contact support.");
    }
    
    try {
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log(`Failed login attempt for user: ${email} (password mismatch)`);
        throw new Error("The email or password you entered is incorrect. Please try again.");
      }
      
      console.log(`Successful login for user: ${email}`);
    } catch (bcryptError) {
      console.error("Error during password verification:", bcryptError);
      throw new Error("Authentication error. Please try again.");
    }
    
    // Create user object (without password)
    const authUser: User = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      createdAt: new Date(user.createdAt),
      userType: user.userType || 'personal'
    };
    
    // Generate JWT token
    const token = jwt.sign({ uid: authUser.uid }, JWT_SECRET, { expiresIn: '7d' });
    
    // Store token in localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    
    // Update auth state
    notifyAuthStateChanged(authUser);
    
    return { user: authUser, token };
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

// Sign out user
export async function signOut() {
  try {
    // Clear token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    
    // Update auth state
    notifyAuthStateChanged(null);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// Initialize auth - check if user is signed in from token
export async function initializeAuth() {
  // Only run on client
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
      
      // Fetch user data
      const query = `
        SELECT uid, email, name, photo_url as photoURL, created_at as createdAt
        FROM Users
        WHERE uid = @uid;
      `;
      
      const users = await executeQuery<any>(query, { uid: decoded.uid });
      
      if (users.length > 0) {
        const user = users[0];
        
        // Create user object
        const authUser: User = {
          uid: user.uid,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          createdAt: new Date(user.createdAt),
          userType: user.userType || 'personal'
        };
        
        // Update auth state
        notifyAuthStateChanged(authUser);
      }
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('auth_token');
    }
  }
}

// Get current authenticated user
export function getCurrentUser() {
  return currentUser;
}

interface AuthResponse {
  token: string;
  user: User;
}

export async function registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUsers = await executeQuery(
      'SELECT * FROM Users WHERE email = @email',
      { email }
    );

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique ID
    const uid = generateUniqueId();
    const createdAt = new Date();

    // Insert the new user
    await executeQuery(
      'INSERT INTO Users (uid, email, password, name, photo_url, created_at) VALUES (@uid, @email, @password, @name, @photoURL, @createdAt)',
      { uid, email, password: hashedPassword, name, photoURL: null, createdAt }
    );

    // Create JWT token
    const token = generateToken(uid);

    // Return user data and token
    return {
      token,
      user: { 
        uid, 
        email, 
        name,
        photoURL: null,
        createdAt
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await executeQuery<any>(
      'SELECT uid, email, password, name, photo_url as photoURL, created_at as createdAt FROM Users WHERE email = @email',
      { email }
    );

    if (users.length === 0) {
      throw new Error("The email or password you entered is incorrect. Please try again.");
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("The email or password you entered is incorrect. Please try again.");
    }

    // Create JWT token
    const token = generateToken(user.uid);

    // Return user data and token
    return {
      token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        createdAt: new Date(user.createdAt)
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function getUserProfile(): Promise<User | null> {
  try {
    // Get token from localStorage (this will run on client side)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        return null;
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { userId: string };
      
      // Get user data
      const users = await executeQuery<any>(
        'SELECT uid, email, name, photo_url as photoURL, created_at as createdAt FROM Users WHERE uid = @uid',
        { uid: decoded.userId }
      );

      if (users.length === 0) {
        return null;
      }

      return {
        uid: users[0].uid,
        email: users[0].email,
        name: users[0].name,
        photoURL: users[0].photoURL,
        createdAt: new Date(users[0].createdAt)
      };
    }
    return null;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  // In JWT-based auth, we just need to remove the token from localStorage
  // No server-side logout needed
  return Promise.resolve();
}

export async function updateUserProfile(uid: string, userData: Partial<User>): Promise<User> {
  try {
    // Update user data
    const updateFields: string[] = [];
    const params: any = { uid };

    if (userData.name) {
      updateFields.push('name = @name');
      params.name = userData.name;
    }

    if (userData.email) {
      updateFields.push('email = @email');
      params.email = userData.email;
    }

    if (userData.photoURL !== undefined) {
      updateFields.push('photo_url = @photoURL');
      params.photoURL = userData.photoURL;
    }

    if (updateFields.length > 0) {
      await executeQuery(
        `UPDATE Users SET ${updateFields.join(', ')} WHERE uid = @uid`,
        params
      );
    }

    // Get updated user data
    const users = await executeQuery<any>(
      'SELECT uid, email, name, photo_url as photoURL, created_at as createdAt FROM Users WHERE uid = @uid',
      { uid }
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    return {
      uid: users[0].uid,
      email: users[0].email,
      name: users[0].name,
      photoURL: users[0].photoURL,
      createdAt: new Date(users[0].createdAt)
    };
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
}

// Add this function after the updateUserProfile function
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    console.log('Attempting to change password for user:', userId);
    
    // First, get the user to verify the current password
    const query = `
      SELECT uid, password 
      FROM Users 
      WHERE uid = @userId;
    `;
    
    const users = await executeQuery<any>(query, { userId });
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const user = users[0];
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(newPassword)) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one number");
    }
    
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one special character");
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password
    const updateQuery = `
      UPDATE Users 
      SET password = @password, updated_at = @updatedAt 
      WHERE uid = @userId;
    `;
    
    await executeQuery(updateQuery, {
      userId,
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    console.log('Password updated successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

// Update the deleteAccount function to fix the pool issue
export async function deleteAccount(userId: string, password: string): Promise<boolean> {
  try {
    console.log('Attempting to delete account for user:', userId);
    
    // First, verify the user's password
    const query = `
      SELECT uid, password 
      FROM Users 
      WHERE uid = @userId;
    `;
    
    const users = await executeQuery<any>(query, { userId });
    
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const user = users[0];
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }
    
    // Start a transaction for data deletion
    // Get a connection for transaction
    const pool = await initializeDatabase();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Create requests based on the transaction
      const request = new sql.Request(transaction);
      
      // Delete user's projects and cascading project items and steps (thanks to ON DELETE CASCADE)
      await request.query(`
        DELETE FROM Projects 
        WHERE uid = '${userId}'
      `);
      
      // Delete the user
      await request.query(`
        DELETE FROM Users 
        WHERE uid = '${userId}'
      `);
      
      // Commit the transaction
      await transaction.commit();
      
      console.log('User account deleted successfully:', userId);
      return true;
    } catch (transactionError) {
      // If there's an error, roll back the transaction
      await transaction.rollback();
      console.error('Transaction error during account deletion:', transactionError);
      throw new Error('Failed to delete account. Database error.');
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}

// Helper functions
function generateToken(userId: string): string {
  return jwt.sign(
    { uid: userId },
    process.env.JWT_SECRET || JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Generate a password reset token
export async function generatePasswordResetToken(email: string): Promise<{token: string, expiresAt: Date} | null> {
  try {
    // Find user by email
    const query = `
      SELECT uid, email 
      FROM Users 
      WHERE email = @email;
    `;
    
    const users = await executeQuery<any>(query, { email });
    
    if (users.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      // Return success anyway to prevent email enumeration
      return null;
    }
    
    const user = users[0];
    
    // Generate a random token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store the reset token in the database
    const updateQuery = `
      UPDATE Users 
      SET reset_token = @resetToken, reset_token_expires = @expiresAt 
      WHERE uid = @userId;
    `;
    
    await executeQuery(updateQuery, {
      userId: user.uid,
      resetToken,
      expiresAt
    });
    
    console.log(`Password reset token generated for user: ${email}`);
    return {
      token: resetToken,
      expiresAt
    };
  } catch (error) {
    console.error('Error generating password reset token:', error);
    throw error;
  }
}

// Reset password using a valid token
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    // Find user by reset token
    const query = `
      SELECT uid, email, reset_token, reset_token_expires 
      FROM Users 
      WHERE reset_token = @token;
    `;
    
    const users = await executeQuery<any>(query, { token });
    
    if (users.length === 0) {
      throw new Error('Invalid or expired reset token');
    }
    
    const user = users[0];
    
    // Check if token has expired
    const tokenExpiry = new Date(user.reset_token_expires);
    const now = new Date();
    
    if (now > tokenExpiry) {
      throw new Error('Reset token has expired');
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(newPassword)) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one number");
    }
    
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one special character");
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password and clear the reset token
    const updateQuery = `
      UPDATE Users 
      SET password = @password, reset_token = NULL, reset_token_expires = NULL, updated_at = @updatedAt 
      WHERE uid = @userId;
    `;
    
    await executeQuery(updateQuery, {
      userId: user.uid,
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    console.log(`Password reset successfully for user: ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
} 