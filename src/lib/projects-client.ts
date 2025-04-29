'use client';

// Client-side project service
// Makes API calls to server endpoints rather than directly accessing database

// Project interface
export interface Project {
  id?: string;
  uid: string;
  title: string;
  description: string;
  projectType?: string;
  completedAt?: string;
  syncStatus: string;
}

export interface ProjectWithDetails extends Project {
  requiredItems: string[];
  steps: string[];
}

// Get user profile
export async function getUserProfile(userId: string) {
  try {
    const response = await fetch(`/api/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(userId: string, profileData: any) {
  try {
    const response = await fetch(`/api/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Get projects for a user
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const response = await fetch(`/api/projects/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user projects');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user projects:', error);
    return [];
  }
}

// Get a project with all its details
export async function getProjectWithDetails(projectId: string): Promise<ProjectWithDetails | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get project details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting project details:', error);
    return null;
  }
}

// Save a completed project
export async function saveCompletedProject(project: ProjectWithDetails): Promise<boolean> {
  try {
    console.log('Client: Saving project:', project.title);
    
    // Create a simplified version of the project for logging
    const simplifiedProject = {
      id: project.id,
      uid: project.uid,
      title: project.title,
      description: project.description?.substring(0, 30) + '...',
      completedAt: project.completedAt,
      itemsCount: project.requiredItems?.length || 0,
      stepsCount: project.steps?.length || 0
    };
    console.log('Project details:', simplifiedProject);
    
    // Try the normal save endpoint first
    try {
      // Make POST request to the API
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(project)
      });
      
      // Check response status
      if (response.ok) {
        // If response was successful, parse the result
        const result = await response.json();
        console.log('Project saved successfully with ID:', result.projectId);
        return true;
      }
      
      // If we get here, the response wasn't OK
      console.log('Primary save endpoint failed, trying direct save endpoint...');
      throw new Error(`Primary save failed with status: ${response.status}`);
      
    } catch (primarySaveError) {
      console.error('Error with primary save endpoint:', primarySaveError);
      
      // Try the fallback direct-save endpoint
      console.log('Attempting to save with direct-save endpoint...');
      
      const directResponse = await fetch('/api/direct-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(project)
      });
      
      if (!directResponse.ok) {
        // Try to get error details from response
        let errorData;
        try {
          errorData = await directResponse.json();
        } catch (e) {
          errorData = { message: 'Could not parse error response' };
        }
        
        console.error(`Direct save response error: ${directResponse.status}`, errorData);
        return false;
      }
      
      // Direct save was successful
      const directResult = await directResponse.json();
      console.log('Project saved successfully with direct-save endpoint. ID:', directResult.projectId);
      return true;
    }
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
} 