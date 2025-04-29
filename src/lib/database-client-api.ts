"use client";

// Client-side API for working with database
// This file makes API calls to the server API routes, rather than directly connecting to SQL Server

// Interfaces
interface Project {
  id: string;
  uid: string;
  title: string;
  description: string;
  projectType?: string;
  completedAt: string;
  syncStatus: string;
  requiredItems?: string[];
  steps?: string[];
  videos?: any[];
}

// Function to save a completed project
export async function saveCompletedProject(project: Project): Promise<boolean> {
  try {
    const response = await fetch('/api/projects/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
}

// Function to get user projects
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const response = await fetch(`/api/projects/user/${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

// Function to get a project with details
export async function getProjectDetails(projectId: string): Promise<Project | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching project details:', error);
    return null;
  }
} 