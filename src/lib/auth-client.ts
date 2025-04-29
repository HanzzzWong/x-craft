'use client';

// Client-side authentication service
// This file makes API calls instead of directly accessing the database

// User interface
export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  createdAt: Date;
  userType?: string;
}

// Add this interface after the User interface
export interface EmailPreferences {
  userId: string;
  projectUpdates: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  lastUpdated: Date;
}

interface AuthResponse {
  token: string;
  user: User;
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

// Safe localStorage access - prevent SSR errors
function getLocalStorage() {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

// Get token safely from localStorage
function getAuthToken(): string | null {
  const storage = getLocalStorage();
  return storage ? storage.getItem('authToken') : null;
}

// Set token safely in localStorage
function setAuthToken(token: string): void {
  const storage = getLocalStorage();
  if (storage) {
    storage.setItem('authToken', token);
  }
}

// Remove token safely from localStorage
function removeAuthToken(): void {
  const storage = getLocalStorage();
  if (storage) {
    storage.removeItem('authToken');
  }
}

// Register a new user
export async function registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    console.log('Attempting registration with:', { email, name });
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    // Parse response data
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error('Failed to parse registration response:', parseError);
      throw new Error('Invalid server response. Please try again.');
    }
    
    console.log('Registration response:', response.status, responseData);

    // Even if the record was created but the response has an error status,
    // we'll consider it an unsuccessful registration
    if (!response.ok) {
      throw new Error(responseData.error || responseData.message || 'Registration failed');
    }
    
    // Ensure the response has proper format
    if (!responseData.token || !responseData.user) {
      console.error('Invalid registration response format:', responseData);
      throw new Error('Invalid server response format. Please try again.');
    }
    
    // Store token in localStorage
    setAuthToken(responseData.token);
    
    // Format createdAt as Date object if it's a string
    if (responseData.user.createdAt && typeof responseData.user.createdAt === 'string') {
      responseData.user.createdAt = new Date(responseData.user.createdAt);
    }
    
    // Update auth state
    notifyAuthStateChanged(responseData.user);
    
    return responseData;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Login an existing user
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      // Use the server's error message if available, fallback to a generic message
      const errorMessage = responseData.error || responseData.message || 'Authentication failed';
      console.error('Login failed:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Store token in localStorage
    setAuthToken(responseData.token);
    
    // Update auth state with user data
    notifyAuthStateChanged(responseData.user);
    
    return responseData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get the current user's profile
export async function getUserProfile(): Promise<User | null> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      return null;
    }

    const response = await fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        removeAuthToken();
        return null;
      }
      throw new Error('Failed to get user profile');
    }

    const data = await response.json();
    
    // Update auth state
    if (data.user) {
      notifyAuthStateChanged(data.user);
    }
    
    return data.user;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

// Logout the current user
export async function logoutUser(): Promise<void> {
  removeAuthToken();
  notifyAuthStateChanged(null);
  return Promise.resolve();
}

// Update user profile
export async function updateUserProfile(userData: Partial<User>): Promise<User> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    console.log('Updating user profile with data:', userData);

    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Failed to update profile:', responseData);
      throw new Error(responseData.message || 'Failed to update profile');
    }

    // Ensure the response contains the updated user
    if (!responseData.user) {
      console.error('Invalid response format:', responseData);
      throw new Error('Invalid server response format');
    }
    
    console.log('Profile updated successfully:', responseData.user);

    // Update auth state
    if (responseData.user) {
      notifyAuthStateChanged(responseData.user);
    }
    
    return responseData.user;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

// Initialize auth - check if user is signed in from token
export async function initializeAuth() {
  const token = getAuthToken();
  
  if (token) {
    try {
      // Validate the token and get user data
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.user) {
          // Ensure createdAt is a Date object
          const authUser = {
            ...data.user,
            createdAt: new Date(data.user.createdAt)
          };
          
          // Update auth state
          notifyAuthStateChanged(authUser);
        }
      } else {
        // Token is invalid
        removeAuthToken();
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      removeAuthToken();
    }
  }
}

// Get current authenticated user
export function getCurrentUser() {
  return currentUser;
}

// Upload a profile photo
export async function uploadProfilePhoto(file: File): Promise<string> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    // Create form data
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch('/api/user/profile-photo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to upload profile photo');
    }

    // Update the current user's photo URL
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        photoURL: responseData.photoURL
      };
      notifyAuthStateChanged(updatedUser);
    }
    
    return responseData.photoURL;
  } catch (error) {
    console.error('Profile photo upload error:', error);
    throw error;
  }
}

// Add this function after the uploadProfilePhoto function
export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to change password');
    }

    return true;
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
}

// Add this function after the changePassword function
export async function deleteAccount(password: string): Promise<boolean> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/user/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to delete account');
    }

    // Remove token on successful deletion
    removeAuthToken();
    
    // Update auth state
    notifyAuthStateChanged(null);

    return true;
  } catch (error) {
    console.error('Account deletion error:', error);
    throw error;
  }
}

// Add these functions after the deleteAccount function
export async function getEmailPreferences(): Promise<EmailPreferences | null> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/user/email-preferences', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeAuthToken();
        return null;
      }
      throw new Error('Failed to get email preferences');
    }

    const data = await response.json();
    return data.preferences;
  } catch (error) {
    console.error('Error getting email preferences:', error);
    return null;
  }
}

export async function updateEmailPreferences(preferences: Omit<EmailPreferences, 'userId' | 'lastUpdated'>): Promise<EmailPreferences | null> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/user/email-preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(preferences)
    });

    if (!response.ok) {
      throw new Error('Failed to update email preferences');
    }

    const data = await response.json();
    return data.preferences;
  } catch (error) {
    console.error('Error updating email preferences:', error);
    throw error;
  }
} 