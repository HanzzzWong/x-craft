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
    
    // Ensure we have a valid project ID
    if (!project.id) {
      console.log('No project ID provided, generating one now');
      project.id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    }
    
    // Ensure sync status is set
    if (!project.syncStatus) {
      project.syncStatus = 'synced';
    }
    
    // Try to save with all available methods, starting with direct-save which is more reliable
    // Direct save endpoint
    try {
      console.log('Attempting to save with direct-save endpoint first...');
      
      const directResponse = await fetch('/api/direct-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(project)
      });
      
      if (directResponse.ok) {
        const directResult = await directResponse.json();
        console.log('Project saved successfully with direct-save endpoint. ID:', directResult.projectId);
        return true;
      }
      
      // Try to get error details from response
      let errorData;
      try {
        errorData = await directResponse.json();
      } catch (e) {
        errorData = { message: 'Could not parse error response' };
      }
      
      console.error(`Direct save response error: ${directResponse.status}`, errorData);
      console.log('Direct save endpoint failed, trying primary save endpoint...');
    } catch (directSaveError) {
      console.error('Error with direct-save endpoint:', directSaveError);
      console.log('Falling back to primary save endpoint...');
    }
    
    // Try the normal save endpoint as fallback
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
        console.log('Project saved successfully with primary save endpoint. ID:', result.projectId);
        return true;
      }
      
      // If we get here, the response wasn't OK
      console.error(`Primary save failed with status: ${response.status}`);
      
      // Last resort, try with custom fetch implementation
      return await saveProjectFallback(project);
    } catch (saveError) {
      console.error('All save methods failed:', saveError);
      return false;
    }
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
}

// Last resort fallback that attempts to save directly
async function saveProjectFallback(project: ProjectWithDetails): Promise<boolean> {
  try {
    console.log('Attempting direct fetch fallback save...');
    
    // Prepare data for direct saving
    const directSaveData = {
      operation: 'saveProject',
      projectData: {
        id: project.id,
        uid: project.uid,
        title: project.title,
        description: project.description,
        projectType: project.projectType,
        completedAt: project.completedAt,
        syncStatus: project.syncStatus,
        requiredItems: project.requiredItems,
        steps: project.steps
      }
    };
    
    // Attempt direct POST to our custom endpoint
    const response = await fetch('/api/custom-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Save': 'true',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify(directSaveData)
    });
    
    if (response.ok) {
      console.log('Project saved successfully with fallback method');
      return true;
    }
    
    console.error('Fallback save method also failed');
    return false;
  } catch (error) {
    console.error('Error in save fallback:', error);
    return false;
  }
} 