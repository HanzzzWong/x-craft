import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: Request) {
  try {
    console.log('Updating all stored procedures...');
    
    // Drop existing procedures if they exist
    await executeQuery(`
      IF OBJECT_ID('dbo.SaveProject', 'P') IS NOT NULL
        DROP PROCEDURE dbo.SaveProject;
      
      IF OBJECT_ID('dbo.AddProjectItem', 'P') IS NOT NULL
        DROP PROCEDURE dbo.AddProjectItem;
      
      IF OBJECT_ID('dbo.AddProjectStep', 'P') IS NOT NULL
        DROP PROCEDURE dbo.AddProjectStep;
      
      IF OBJECT_ID('dbo.GetUserProjects', 'P') IS NOT NULL
        DROP PROCEDURE dbo.GetUserProjects;
      
      IF OBJECT_ID('dbo.GetProjectWithDetails', 'P') IS NOT NULL
        DROP PROCEDURE dbo.GetProjectWithDetails;
    `);
    
    console.log('Dropped existing procedures');
    
    // Create SaveProject procedure
    await executeQuery(`
      CREATE PROCEDURE dbo.SaveProject
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
    
    console.log('Created SaveProject procedure');
    
    // Create AddProjectItem procedure
    await executeQuery(`
      CREATE PROCEDURE dbo.AddProjectItem
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
    
    console.log('Created AddProjectItem procedure');
    
    // Create AddProjectStep procedure
    await executeQuery(`
      CREATE PROCEDURE dbo.AddProjectStep
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
    
    console.log('Created AddProjectStep procedure');
    
    // Create GetUserProjects procedure
    await executeQuery(`
      CREATE PROCEDURE dbo.GetUserProjects
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
    
    console.log('Created GetUserProjects procedure');
    
    // Create GetProjectWithDetails procedure
    await executeQuery(`
      CREATE PROCEDURE dbo.GetProjectWithDetails
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
    
    console.log('Created GetProjectWithDetails procedure');
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'All stored procedures updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating stored procedures:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error updating stored procedures',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 