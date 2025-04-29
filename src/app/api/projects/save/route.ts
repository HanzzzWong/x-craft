import { NextResponse } from 'next/server';
import { saveProject, addProjectItem, addProjectStep } from '@/lib/projects';
import { executeQuery } from '@/lib/database';

export async function POST(request: Request) {
  console.log('Project save API endpoint called');
  
  try {
    // First check if database connection works and tables exist
    try {
      console.log('Checking database connection and tables');
      
      // Check if Projects table exists
      const projectsTable = await executeQuery<{ exists: number }>(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Projects')
          SELECT 1 as exists
        ELSE
          SELECT 0 as exists
      `);
      
      // Create tables if they don't exist
      if (!projectsTable[0]?.exists) {
        console.log('Projects table does not exist, creating tables...');
        
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
            FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
          )
        `);
        
        // Create ProjectSteps table
        await executeQuery(`
          CREATE TABLE ProjectSteps (
            id INT IDENTITY(1,1) PRIMARY KEY,
            project_id NVARCHAR(100) NOT NULL,
            step_content NVARCHAR(MAX) NOT NULL,
            step_order INT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
          )
        `);
        
        console.log('All tables created successfully');
        
        // Create stored procedures
        await executeQuery(`
          CREATE PROCEDURE SaveProject
            @ProjectId NVARCHAR(100),
            @UserId NVARCHAR(100),
            @Title NVARCHAR(255),
            @Description NVARCHAR(MAX),
            @ProjectType NVARCHAR(50) = NULL,
            @SyncStatus NVARCHAR(20) = 'synced',
            @CompletedAt DATETIME = NULL
          AS
          BEGIN
            SET NOCOUNT ON;
            
            MERGE INTO Projects AS target
            USING (SELECT @ProjectId AS id) AS source
            ON (target.id = source.id)
            WHEN MATCHED THEN
              UPDATE SET
                title = @Title,
                description = @Description,
                project_type = @ProjectType,
                completed_at = ISNULL(@CompletedAt, GETDATE()),
                sync_status = @SyncStatus,
                updated_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (id, uid, title, description, project_type, completed_at, sync_status, created_at, updated_at)
              VALUES (@ProjectId, @UserId, @Title, @Description, @ProjectType, ISNULL(@CompletedAt, GETDATE()), @SyncStatus, GETDATE(), GETDATE());
            
            SELECT @ProjectId as id;
          END
        `);
        
        await executeQuery(`
          CREATE PROCEDURE AddProjectItem
            @ProjectId NVARCHAR(100),
            @ItemName NVARCHAR(255),
            @ItemOrder INT
          AS
          BEGIN
            SET NOCOUNT ON;
            
            INSERT INTO ProjectItems (project_id, item_name, item_order)
            VALUES (@ProjectId, @ItemName, @ItemOrder);
            
            SELECT SCOPE_IDENTITY() as id;
          END
        `);
        
        await executeQuery(`
          CREATE PROCEDURE AddProjectStep
            @ProjectId NVARCHAR(100),
            @StepContent NVARCHAR(MAX),
            @StepOrder INT
          AS
          BEGIN
            SET NOCOUNT ON;
            
            INSERT INTO ProjectSteps (project_id, step_content, step_order)
            VALUES (@ProjectId, @StepContent, @StepOrder);
            
            SELECT SCOPE_IDENTITY() as id;
          END
        `);
        
        await executeQuery(`
          CREATE PROCEDURE GetUserProjects
            @UserId NVARCHAR(100)
          AS
          BEGIN
            SET NOCOUNT ON;
            
            SELECT
              id,
              uid,
              title,
              description,
              project_type as projectType,
              completed_at as completedAt,
              sync_status as syncStatus,
              created_at as createdAt,
              updated_at as updatedAt
            FROM
              Projects
            WHERE
              uid = @UserId
            ORDER BY
              created_at DESC;
          END
        `);
        
        await executeQuery(`
          CREATE PROCEDURE GetProjectWithDetails
            @ProjectId NVARCHAR(100)
          AS
          BEGIN
            SET NOCOUNT ON;
            
            -- Get project
            SELECT
              id,
              uid,
              title,
              description,
              project_type as projectType,
              completed_at as completedAt,
              sync_status as syncStatus,
              created_at as createdAt,
              updated_at as updatedAt
            FROM
              Projects
            WHERE
              id = @ProjectId;
            
            -- Get items
            SELECT
              id,
              project_id as projectId,
              item_name as itemName,
              item_order as itemOrder
            FROM
              ProjectItems
            WHERE
              project_id = @ProjectId
            ORDER BY
              item_order;
            
            -- Get steps
            SELECT
              id,
              project_id as projectId,
              step_content as stepContent,
              step_order as stepOrder
            FROM
              ProjectSteps
            WHERE
              project_id = @ProjectId
            ORDER BY
              step_order;
          END
        `);
        
        console.log('All stored procedures created successfully');
      } else {
        console.log('Database tables already exist');
      }
    } catch (dbError) {
      console.error('Error checking/creating database tables:', dbError);
    }
    
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
    
    if (!project.id || !project.uid || !project.title || !project.description) {
      console.error('Missing required project fields', { 
        hasId: Boolean(project.id), 
        hasUid: Boolean(project.uid), 
        hasTitle: Boolean(project.title), 
        hasDescription: Boolean(project.description) 
      });
      
      return NextResponse.json(
        { error: 'Missing required project fields' },
        { status: 400 }
      );
    }

    // Save the project with completed date
    console.log('Saving main project record');
    
    try {
      // Check if user exists first
      const userCheck = await executeQuery<{userExists: number}>(`
        SELECT COUNT(*) as userExists FROM Users WHERE uid = @uid
      `, { uid: project.uid });
      
      if (!userCheck[0]?.userExists) {
        console.error(`User with ID ${project.uid} does not exist`);
        return NextResponse.json(
          { error: 'User does not exist', details: `No user found with ID: ${project.uid}` },
          { status: 400 }
        );
      }
      
      // First try to save using the saveProject function
      const projectId = await saveProject({
        id: project.id,
        uid: project.uid,
        title: project.title,
        description: project.description,
        projectType: project.projectType || null,
        completedAt: project.completedAt ? new Date(project.completedAt) : new Date(),
        syncStatus: project.syncStatus || 'synced'
      });

      if (!projectId) {
        console.error('Failed to save project - no projectId returned');
        return NextResponse.json(
          { error: 'Failed to save project' },
          { status: 500 }
        );
      }

      console.log(`Project saved successfully with ID: ${projectId}`);
      
      // Continue with adding items and steps
      if (project.requiredItems && project.requiredItems.length > 0) {
        console.log(`Adding ${project.requiredItems.length} required items`);
        
        for (let i = 0; i < project.requiredItems.length; i++) {
          await addProjectItem({
            projectId,
            itemName: project.requiredItems[i],
            itemOrder: i
          });
        }
        console.log('All required items added successfully');
      } else {
        console.log('No required items to add');
      }

      // Add project steps
      if (project.steps && project.steps.length > 0) {
        console.log(`Adding ${project.steps.length} project steps`);
        
        for (let i = 0; i < project.steps.length; i++) {
          await addProjectStep({
            projectId,
            stepContent: project.steps[i],
            stepOrder: i
          });
        }
        console.log('All project steps added successfully');
      } else {
        console.log('No project steps to add');
      }

      console.log('Project save completed successfully');
      return NextResponse.json({ success: true, projectId });
      
    } catch (saveError) {
      console.error('Error in saveProject function:', saveError);
      
      // Try a direct insert as fallback
      try {
        console.log('Attempting direct insert fallback');
        
        // Check if table has required columns
        const tableColumns = await executeQuery<{column_name: string}>(
          `SELECT COLUMN_NAME as column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Projects'`
        );
        
        console.log('Available columns in Projects table:', tableColumns.map(c => c.column_name));
        
        // Create a modified query based on available columns
        const hasCreatedAt = tableColumns.some(c => c.column_name.toLowerCase() === 'created_at');
        const hasUpdatedAt = tableColumns.some(c => c.column_name.toLowerCase() === 'updated_at');
        
        // Try to insert directly 
        const completedAt = project.completedAt ? new Date(project.completedAt) : new Date();
        const now = new Date();
        
        let insertQuery = `
          IF EXISTS (SELECT * FROM Projects WHERE id = @id)
          BEGIN
            UPDATE Projects SET 
              title = @title,
              description = @description,
              project_type = @projectType,
              completed_at = @completedAt,
              sync_status = @syncStatus
        `;
        
        if (hasUpdatedAt) {
          insertQuery += `, updated_at = @updatedAt`;
        }
        
        insertQuery += `
            WHERE id = @id
          END
          ELSE
          BEGIN
            INSERT INTO Projects (id, uid, title, description, project_type, completed_at, sync_status
        `;
        
        if (hasCreatedAt) {
          insertQuery += `, created_at`;
        }
        
        if (hasUpdatedAt) {
          insertQuery += `, updated_at`;
        }
        
        insertQuery += `) VALUES (@id, @uid, @title, @description, @projectType, @completedAt, @syncStatus`;
        
        if (hasCreatedAt) {
          insertQuery += `, @createdAt`;
        }
        
        if (hasUpdatedAt) {
          insertQuery += `, @updatedAt`;
        }
        
        insertQuery += `)
          END
        `;
        
        console.log('Executing direct insert with query:', insertQuery);
        
        await executeQuery(insertQuery, {
          id: project.id,
          uid: project.uid,
          title: project.title,
          description: project.description,
          projectType: project.projectType || null,
          completedAt: completedAt,
          syncStatus: project.syncStatus || 'synced',
          createdAt: now,
          updatedAt: now
        });
        
        console.log(`Project saved directly with ID: ${project.id}`);
        
        // Now try to add items directly
        if (project.requiredItems && project.requiredItems.length > 0) {
          console.log(`Adding ${project.requiredItems.length} required items directly`);
          
          for (let i = 0; i < project.requiredItems.length; i++) {
            await executeQuery(`
              INSERT INTO ProjectItems (project_id, item_name, item_order)
              VALUES (@projectId, @itemName, @itemOrder)
            `, {
              projectId: project.id,
              itemName: project.requiredItems[i],
              itemOrder: i
            });
          }
        }
        
        // Add steps directly
        if (project.steps && project.steps.length > 0) {
          console.log(`Adding ${project.steps.length} project steps directly`);
          
          for (let i = 0; i < project.steps.length; i++) {
            await executeQuery(`
              INSERT INTO ProjectSteps (project_id, step_content, step_order)
              VALUES (@projectId, @stepContent, @stepOrder)
            `, {
              projectId: project.id,
              stepContent: project.steps[i],
              stepOrder: i
            });
          }
        }
        
        return NextResponse.json({ success: true, projectId: project.id });
      } catch (directError: any) {
        console.error('Direct insert also failed:', directError);
        
        return NextResponse.json(
          { 
            error: 'Database error during direct insert', 
            details: directError.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error saving project:', error);
    
    // Return detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 