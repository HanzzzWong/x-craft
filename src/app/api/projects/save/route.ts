import { NextResponse } from 'next/server';
import { saveProject, addProjectItem, addProjectStep } from '@/lib/projects';
import { executeQuery } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  console.log('Project save API endpoint called');
  
  try {
    const project = await request.json();
    console.log('Received project data:', {
      id: project.id,
      uid: project.uid,
      title: project.title,
      description: project.description?.substring(0, 30) + '...',
      projectType: project.projectType,
      requiredItems: project.requiredItems?.length,
      stepsCount: project.steps?.length
    });
    
    // Validate required fields
    if (!project.uid || !project.title || !project.description) {
      console.error('Missing required project fields', { 
        hasUid: Boolean(project.uid), 
        hasTitle: Boolean(project.title), 
        hasDescription: Boolean(project.description) 
      });
      
      return NextResponse.json(
        { 
          error: 'Missing required project fields',
          details: 'uid, title, and description are required' 
        },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    const projectId = project.id || uuidv4();
    
    try {
      // Check if user exists first
      const userCheck = await executeQuery<{userExists: number}>(`
        SELECT COUNT(*) as userExists FROM Users WHERE uid = @uid
      `, { uid: project.uid });
      
      if (!userCheck[0]?.userExists) {
        console.error(`User with ID ${project.uid} does not exist`);
        return NextResponse.json(
          { 
            error: 'User not found',
            details: `No user found with ID ${project.uid}. User must be registered before saving projects.`
          },
          { status: 404 }
        );
      }
      
      // Save the project with completed date (will update if exists)
      console.log('Saving main project record');
      
      await saveProject({
        id: projectId,
        uid: project.uid,
        title: project.title,
        description: project.description,
        projectType: project.projectType || null,
        completedAt: project.completedAt ? new Date(project.completedAt) : new Date(),
        syncStatus: project.syncStatus || 'synced'
      });
      
      // Add required items
      if (project.requiredItems && project.requiredItems.length > 0) {
        console.log(`Adding ${project.requiredItems.length} required items`);
        
        for (let i = 0; i < project.requiredItems.length; i++) {
          await addProjectItem({
            projectId,
            itemName: project.requiredItems[i],
            itemOrder: i
          });
        }
      }
      
      // Add steps
      if (project.steps && project.steps.length > 0) {
        console.log(`Adding ${project.steps.length} project steps`);
        
        for (let i = 0; i < project.steps.length; i++) {
          await addProjectStep({
            projectId,
            stepContent: project.steps[i],
            stepOrder: i
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        projectId,
        message: 'Project saved successfully'
      });
      
    } catch (saveError) {
      console.error('Error saving project:', saveError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save project',
        details: saveError instanceof Error ? saveError.message : String(saveError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in project save endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 