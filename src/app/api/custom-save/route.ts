import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: Request) {
  try {
    console.log('Custom save endpoint called');
    
    // Parse the request body
    const data = await request.json();
    const { operation, projectData } = data;
    
    if (operation !== 'saveProject' || !projectData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid operation or missing project data'
      }, { status: 400 });
    }
    
    console.log('Saving project using direct SQL queries:', {
      id: projectData.id,
      title: projectData.title,
      itemsCount: projectData.requiredItems?.length || 0
    });
    
    // Use direct SQL queries instead of stored procedures
    try {
      // 1. Check if Projects table exists
      const tablesExist = await executeQuery<{table_count: number}>(`
        SELECT COUNT(*) as table_count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Projects'
      `);
      
      // Create tables if needed
      if (!tablesExist[0] || tablesExist[0].table_count === 0) {
        console.log('Projects table does not exist, creating it...');
        
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
        
        console.log('Tables created successfully');
      }
      
      // 2. Check if the project already exists
      const existingProject = await executeQuery<{exists: number}>(`
        SELECT COUNT(*) as exists 
        FROM Projects 
        WHERE id = @id
      `, { id: projectData.id });
      
      const now = new Date();
      const completedAt = projectData.completedAt ? new Date(projectData.completedAt) : now;
      
      // 3. Insert or update the project
      if (existingProject[0]?.exists > 0) {
        // Update existing project
        console.log('Updating existing project:', projectData.id);
        await executeQuery(`
          UPDATE Projects
          SET 
            title = @title,
            description = @description,
            project_type = @projectType,
            completed_at = @completedAt,
            sync_status = @syncStatus,
            updated_at = @updatedAt
          WHERE id = @id
        `, {
          id: projectData.id,
          title: projectData.title,
          description: projectData.description,
          projectType: projectData.projectType || null,
          completedAt: completedAt,
          syncStatus: projectData.syncStatus || 'synced',
          updatedAt: now
        });
      } else {
        // Insert new project
        console.log('Inserting new project:', projectData.id);
        await executeQuery(`
          INSERT INTO Projects (
            id, uid, title, description, project_type, 
            completed_at, sync_status, created_at, updated_at
          )
          VALUES (
            @id, @uid, @title, @description, @projectType,
            @completedAt, @syncStatus, @createdAt, @updatedAt
          )
        `, {
          id: projectData.id,
          uid: projectData.uid,
          title: projectData.title,
          description: projectData.description,
          projectType: projectData.projectType || null,
          completedAt: completedAt,
          syncStatus: projectData.syncStatus || 'synced',
          createdAt: now,
          updatedAt: now
        });
      }
      
      // 4. Clear existing items and steps
      await executeQuery(`DELETE FROM ProjectItems WHERE project_id = @projectId`, { projectId: projectData.id });
      await executeQuery(`DELETE FROM ProjectSteps WHERE project_id = @projectId`, { projectId: projectData.id });
      
      // 5. Insert project items
      if (projectData.requiredItems && projectData.requiredItems.length > 0) {
        console.log(`Adding ${projectData.requiredItems.length} required items`);
        
        for (let i = 0; i < projectData.requiredItems.length; i++) {
          await executeQuery(`
            INSERT INTO ProjectItems (project_id, item_name, item_order)
            VALUES (@projectId, @itemName, @itemOrder)
          `, {
            projectId: projectData.id,
            itemName: projectData.requiredItems[i],
            itemOrder: i
          });
        }
      }
      
      // 6. Insert project steps
      if (projectData.steps && projectData.steps.length > 0) {
        console.log(`Adding ${projectData.steps.length} project steps`);
        
        for (let i = 0; i < projectData.steps.length; i++) {
          await executeQuery(`
            INSERT INTO ProjectSteps (project_id, step_content, step_order)
            VALUES (@projectId, @stepContent, @stepOrder)
          `, {
            projectId: projectData.id,
            stepContent: projectData.steps[i],
            stepOrder: i
          });
        }
      }
      
      // 7. Return success
      return NextResponse.json({
        success: true,
        projectId: projectData.id,
        message: 'Project saved successfully via custom save endpoint'
      });
      
    } catch (saveError) {
      console.error('Error during custom project save:', saveError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save project',
        details: saveError instanceof Error ? saveError.message : String(saveError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Unexpected error in custom save endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 