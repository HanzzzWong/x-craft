import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    console.log('Direct project save API endpoint called');
    
    // Parse the request body
    const project = await request.json();
    console.log('Received project data:', {
      id: project.id,
      uid: project.uid,
      title: project.title,
      description: project.description?.substring(0, 30) + '...',
      requiredItems: project.requiredItems?.length,
      stepsCount: project.steps?.length
    });
    
    // Basic validation
    if (!project.uid || !project.title || !project.description) {
      return NextResponse.json(
        { error: 'Missing required project fields' },
        { status: 400 }
      );
    }
    
    // Generate a project ID if not provided
    const projectId = project.id || uuidv4();
    
    // Check for Projects table - FIXED QUERY
    const hasProjectsTable = await executeQuery<{table_exists: number}>(`
      SELECT CASE 
        WHEN OBJECT_ID('Projects', 'U') IS NOT NULL THEN 1 
        ELSE 0 
      END AS table_exists
    `);
    
    // Create tables if they don't exist
    if (!hasProjectsTable[0]?.table_exists) {
      console.log('Creating tables for project storage...');
      
      // Create Projects table
      await executeQuery(`
        CREATE TABLE Projects (
          id NVARCHAR(100) PRIMARY KEY,
          uid NVARCHAR(100) NOT NULL,
          title NVARCHAR(255) NOT NULL,
          description NVARCHAR(MAX),
          project_type NVARCHAR(50),
          completed_at DATETIME,
          sync_status NVARCHAR(20) DEFAULT 'synced',
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        )
      `);
      
      // Create ProjectItems table
      await executeQuery(`
        CREATE TABLE ProjectItems (
          id INT IDENTITY(1,1) PRIMARY KEY,
          project_id NVARCHAR(100) NOT NULL,
          item_name NVARCHAR(255) NOT NULL,
          item_order INT NOT NULL,
          CONSTRAINT FK_ProjectItems_Projects FOREIGN KEY (project_id) 
          REFERENCES Projects(id) ON DELETE CASCADE
        )
      `);
      
      // Create ProjectSteps table
      await executeQuery(`
        CREATE TABLE ProjectSteps (
          id INT IDENTITY(1,1) PRIMARY KEY,
          project_id NVARCHAR(100) NOT NULL,
          step_content NVARCHAR(MAX) NOT NULL,
          step_order INT NOT NULL,
          CONSTRAINT FK_ProjectSteps_Projects FOREIGN KEY (project_id) 
          REFERENCES Projects(id) ON DELETE CASCADE
        )
      `);
      
      console.log('Project tables created successfully');
    }
    
    // Check if user exists - FIXED QUERY
    const userCheck = await executeQuery<{user_exists: number}>(`
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM Users WHERE uid = @uid) THEN 1 
        ELSE 0 
      END AS user_exists
    `, { uid: project.uid });
    
    if (!userCheck[0]?.user_exists) {
      console.log('Creating a dummy user since the specified user does not exist');
      
      // Create a dummy user if needed
      await executeQuery(`
        INSERT INTO Users (uid, email, password, name, created_at)
        VALUES (@uid, @email, @password, @name, @createdAt)
      `, {
        uid: project.uid,
        email: `user-${project.uid}@example.com`,
        password: 'dummy-password-hash',
        name: 'Generated User',
        createdAt: new Date()
      });
    }
    
    try {
      // Use a simplified query to save the project - FIXED QUERY
      const projectQuery = `
        IF OBJECT_ID('Projects', 'U') IS NOT NULL
        BEGIN
          IF EXISTS (SELECT 1 FROM Projects WHERE id = @id)
          BEGIN
            -- Update existing project
            UPDATE Projects
            SET 
              title = @title,
              description = @description,
              project_type = @projectType,
              completed_at = @completedAt,
              sync_status = @syncStatus,
              updated_at = GETDATE()
            WHERE id = @id
          END
          ELSE
          BEGIN
            -- Insert new project
            INSERT INTO Projects (
              id, uid, title, description, project_type, 
              completed_at, sync_status, created_at, updated_at
            )
            VALUES (
              @id, @uid, @title, @description, @projectType,
              @completedAt, @syncStatus, GETDATE(), GETDATE()
            )
          END
        END
      `;
      
      await executeQuery(projectQuery, {
        id: projectId,
        uid: project.uid,
        title: project.title,
        description: project.description,
        projectType: project.projectType || null,
        completedAt: project.completedAt ? new Date(project.completedAt) : new Date(),
        syncStatus: project.syncStatus || 'synced'
      });
      
      console.log(`Project saved with ID: ${projectId}`);
      
      // Clear existing items and steps
      await executeQuery(`DELETE FROM ProjectItems WHERE project_id = @projectId`, { projectId });
      await executeQuery(`DELETE FROM ProjectSteps WHERE project_id = @projectId`, { projectId });
      
      // Add project items
      if (project.requiredItems && project.requiredItems.length > 0) {
        console.log(`Adding ${project.requiredItems.length} required items`);
        
        for (let i = 0; i < project.requiredItems.length; i++) {
          await executeQuery(`
            INSERT INTO ProjectItems (project_id, item_name, item_order)
            VALUES (@projectId, @itemName, @itemOrder)
          `, {
            projectId,
            itemName: project.requiredItems[i],
            itemOrder: i
          });
        }
      }
      
      // Add project steps
      if (project.steps && project.steps.length > 0) {
        console.log(`Adding ${project.steps.length} project steps`);
        
        for (let i = 0; i < project.steps.length; i++) {
          await executeQuery(`
            INSERT INTO ProjectSteps (project_id, step_content, step_order)
            VALUES (@projectId, @stepContent, @stepOrder)
          `, {
            projectId,
            stepContent: project.steps[i],
            stepOrder: i
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        projectId,
        message: 'Project saved successfully via direct save'
      });
      
    } catch (saveError) {
      console.error('Error during direct project save:', saveError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save project',
        details: saveError instanceof Error ? saveError.message : String(saveError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Unexpected error in direct save endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 