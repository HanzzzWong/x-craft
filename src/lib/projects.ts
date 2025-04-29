// Project service for SQL Server
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeStoredProcedure } from './database';
import './server-only'; // Mark this file as server-only

// Project interface
export interface Project {
  id?: string;
  uid: string;
  title: string;
  description: string;
  projectType?: string | null;
  completedAt?: Date;
  syncStatus: string;
}

interface ProjectWithDetails extends Project {
  requiredItems: string[];
  steps: string[];
}

interface ProjectItem {
  projectId: string;
  itemName: string;
  itemOrder: number;
}

interface ProjectStep {
  projectId: string;
  stepContent: string;
  stepOrder: number;
}

// Define email preferences interface
export interface EmailPreferences {
  userId: string;
  projectUpdates: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  lastUpdated: Date;
}

// Save a project to the database
export async function saveProject(project: Project): Promise<string> {
  try {
    console.log('Starting saveProject function with data:', { 
      id: project.id,
      uid: project.uid,
      title: project.title,
      description: project.description?.substring(0, 30) + '...',
      projectType: project.projectType,
      completedAt: project.completedAt ? project.completedAt.toISOString() : null,
      syncStatus: project.syncStatus
    });
    
    const projectId = project.id || uuidv4();
    console.log(`Using project ID: ${projectId}`);
    
    // First, check if we can connect to the database and the required tables exist
    try {
      console.log('Checking for Projects table existence');
      const tableCheck = await executeQuery<{table_id: number | null}>(`
        SELECT OBJECT_ID('dbo.Projects', 'U') as table_id
      `);
      
      if (!tableCheck || !tableCheck.length || !tableCheck[0]?.table_id) {
        console.error('Projects table does not exist - will attempt to create it');
        
        // Create Projects table if it doesn't exist
        await executeQuery(`
          IF OBJECT_ID('dbo.Projects', 'U') IS NULL
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
        console.log('Projects table created successfully');
      } else {
        console.log('Projects table exists, proceeding');
      }
    } catch (tableError) {
      console.error('Error checking/creating Projects table:', tableError);
      // Continue with the save anyway, in case the error was just in our checking query
    }
    
    try {
      // Use direct SQL query instead of stored procedure for better error info
      const completedAt = project.completedAt 
        ? project.completedAt instanceof Date 
          ? project.completedAt 
          : new Date(project.completedAt) 
        : new Date();
      
      console.log(`Setting completedAt to: ${completedAt.toISOString()}`);
      
      const saveQuery = `
        IF OBJECT_ID('dbo.Projects', 'U') IS NOT NULL
        BEGIN
          MERGE INTO Projects AS target
          USING (SELECT @ProjectId AS id) AS source
          ON (target.id = source.id)
          WHEN MATCHED THEN
            UPDATE SET
              title = @Title,
              description = @Description,
              project_type = @ProjectType,
              completed_at = @CompletedAt,
              sync_status = @SyncStatus,
              updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (id, uid, title, description, project_type, completed_at, sync_status, created_at, updated_at)
            VALUES (@ProjectId, @UserId, @Title, @Description, @ProjectType, @CompletedAt, @SyncStatus, GETDATE(), GETDATE());
        END
      `;
      
      console.log('Executing save query with MERGE statement');
      await executeQuery(saveQuery, {
        ProjectId: projectId,
        UserId: project.uid,
        Title: project.title,
        Description: project.description,
        ProjectType: project.projectType,
        CompletedAt: completedAt,
        SyncStatus: project.syncStatus || 'synced'
      });
      
      console.log(`Project saved successfully with ID: ${projectId}`);
      return projectId;
    } catch (saveError) {
      console.error('Error saving project with direct query:', saveError);
      
      // Try with stored procedure as fallback
      console.log('Attempting to use stored procedure as fallback');
      await executeStoredProcedure('SaveProject', {
        ProjectId: projectId,
        UserId: project.uid,
        Title: project.title,
        Description: project.description,
        ProjectType: project.projectType,
        CompletedAt: project.completedAt instanceof Date ? project.completedAt : new Date(),
        SyncStatus: project.syncStatus || 'synced'
      });
      
      console.log(`Project saved successfully with stored procedure, ID: ${projectId}`);
      return projectId;
    }
  } catch (error) {
    console.error('Error in saveProject function:', error);
    throw error;
  }
}

// Add a project item
export async function addProjectItem(item: ProjectItem): Promise<void> {
  try {
    await executeStoredProcedure('AddProjectItem', {
      ProjectId: item.projectId,
      ItemName: item.itemName,
      ItemOrder: item.itemOrder
    });
  } catch (error) {
    console.error('Error adding project item:', error);
    throw error;
  }
}

// Add a project step
export async function addProjectStep(step: ProjectStep): Promise<void> {
  try {
    await executeStoredProcedure('AddProjectStep', {
      ProjectId: step.projectId,
      StepContent: step.stepContent,
      StepOrder: step.stepOrder
    });
  } catch (error) {
    console.error('Error adding project step:', error);
    throw error;
  }
}

// Get projects for a user
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const result = await executeStoredProcedure('GetUserProjects', {
      UserId: userId
    });
    
    // Return the first result set (projects)
    return result.recordset || [];
  } catch (error) {
    console.error('Error getting user projects:', error);
    return [];
  }
}

// Get a project with all its details
export async function getProjectWithDetails(projectId: string): Promise<ProjectWithDetails | null> {
  try {
    const result = await executeStoredProcedure('GetProjectWithDetails', {
      ProjectId: projectId
    });
    
    // The stored procedure returns three result sets:
    // 1. Project details
    // 2. Project items
    // 3. Project steps
    
    if (!result.recordset || result.recordset.length === 0) {
      return null;
    }
    
    const project = result.recordset[0];
    
    // Access recordsets safely with type assertions to avoid TypeScript errors
    let items: any[] = [];
    let steps: any[] = [];
    
    if (Array.isArray(result.recordsets)) {
      // If recordsets is an array, we can access by index
      items = result.recordsets.length > 1 ? result.recordsets[1] || [] : [];
      steps = result.recordsets.length > 2 ? result.recordsets[2] || [] : [];
    } else if (result.recordsets) {
      // Fallback case for different typed recordsets
      console.log('Recordsets is not an array, falling back to alternative method');
      items = [];
      steps = [];
    }
    
    return {
      ...project,
      requiredItems: items.map((item: any) => item.itemName),
      steps: steps.map((step: any) => step.stepContent)
    };
  } catch (error) {
    console.error('Error getting project details:', error);
    return null;
  }
}

// Get a single project by ID
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    // Get project basic info
    const projectQuery = `
      SELECT 
        p.id,
        p.uid,
        p.title,
        p.description,
        p.project_type as projectType,
        p.completed_at as completedAt,
        p.sync_status as syncStatus
      FROM 
        Projects p
      WHERE 
        p.id = @projectId;
    `;
    
    const projects = await executeQuery<any>(projectQuery, { projectId });
    
    if (projects.length === 0) {
      return null;
    }
    
    const project = projects[0];
    
    // Get required items
    const itemsQuery = `
      SELECT item_name as itemName
      FROM ProjectItems
      WHERE project_id = @projectId
      ORDER BY item_order;
    `;
    
    const items = await executeQuery<{itemName: string}>(itemsQuery, { projectId });
    
    // Get steps
    const stepsQuery = `
      SELECT step_content as stepContent
      FROM ProjectSteps
      WHERE project_id = @projectId
      ORDER BY step_order;
    `;
    
    const steps = await executeQuery<{stepContent: string}>(stepsQuery, { projectId });
    
    // Complete project object
    return {
      id: project.id,
      uid: project.uid,
      title: project.title,
      description: project.description,
      projectType: project.projectType,
      completedAt: new Date(project.completedAt),
      syncStatus: project.syncStatus,
      requiredItems: items.map(item => item.itemName),
      steps: steps.map(step => step.stepContent)
    };
  } catch (error) {
    console.error("Error getting project by ID:", error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(userId: string, profileData: any) {
  try {
    console.log('Updating user profile in database for user:', userId);
    console.log('Profile data:', profileData);
    
    // Build the SQL query dynamically based on provided fields
    let updateFields = [];
    const params: any = { userId };
    
    // Add name field if provided
    if (profileData.name !== undefined) {
      updateFields.push('name = @name');
      params.name = profileData.name;
    }
    
    // Add photoURL field if provided
    if (profileData.photoURL !== undefined) {
      updateFields.push('photo_url = @photoURL');
      params.photoURL = profileData.photoURL;
    }
    
    // Add userType field if provided
    if (profileData.userType !== undefined) {
      updateFields.push('user_type = @userType');
      params.userType = profileData.userType;
    }
    
    // Always update the updated_at timestamp
    updateFields.push('updated_at = @updatedAt');
    params.updatedAt = new Date();
    
    // Only proceed if there are fields to update
    if (updateFields.length === 0) {
      console.warn('No fields to update for user:', userId);
      return await getUserProfile(userId);
    }
    
    const query = `
      UPDATE Users
      SET 
        ${updateFields.join(', ')}
      WHERE 
        uid = @userId;
    `;
    
    console.log('Executing update query:', query);
    await executeQuery(query, params);
    
    // Fetch and return the updated user profile
    const updatedUser = await getUserProfile(userId);
    console.log('User profile updated successfully:', updatedUser);
    
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(userId: string) {
  try {
    const query = `
      SELECT 
        uid,
        email,
        name,
        photo_url as photoURL,
        created_at as createdAt,
        updated_at as updatedAt,
        user_type as userType
      FROM 
        Users
      WHERE 
        uid = @userId;
    `;
    
    const users = await executeQuery<any>(query, { userId });
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0];
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

// Save user email preferences
export async function saveEmailPreferences(preferences: EmailPreferences): Promise<boolean> {
  try {
    console.log('Saving email preferences for user:', preferences.userId);
    
    // Check if preferences already exist
    const existingPrefs = await executeQuery<any>(`
      SELECT * FROM EmailPreferences WHERE user_id = @userId
    `, { userId: preferences.userId });
    
    if (existingPrefs.length > 0) {
      // Update existing preferences
      await executeQuery(`
        UPDATE EmailPreferences 
        SET 
          project_updates = @projectUpdates, 
          marketing_emails = @marketingEmails, 
          weekly_digest = @weeklyDigest,
          last_updated = @lastUpdated
        WHERE user_id = @userId
      `, {
        userId: preferences.userId,
        projectUpdates: preferences.projectUpdates,
        marketingEmails: preferences.marketingEmails,
        weeklyDigest: preferences.weeklyDigest,
        lastUpdated: new Date()
      });
    } else {
      // Insert new preferences
      await executeQuery(`
        INSERT INTO EmailPreferences (
          user_id, project_updates, marketing_emails, weekly_digest, last_updated
        ) VALUES (
          @userId, @projectUpdates, @marketingEmails, @weeklyDigest, @lastUpdated
        )
      `, {
        userId: preferences.userId,
        projectUpdates: preferences.projectUpdates,
        marketingEmails: preferences.marketingEmails,
        weeklyDigest: preferences.weeklyDigest,
        lastUpdated: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving email preferences:', error);
    throw error;
  }
}

// Get user email preferences
export async function getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  try {
    const preferences = await executeQuery<any>(`
      SELECT 
        user_id as userId,
        project_updates as projectUpdates,
        marketing_emails as marketingEmails,
        weekly_digest as weeklyDigest,
        last_updated as lastUpdated
      FROM EmailPreferences 
      WHERE user_id = @userId
    `, { userId });
    
    if (preferences.length === 0) {
      // Return default preferences if none exist
      return {
        userId,
        projectUpdates: true,
        marketingEmails: false,
        weeklyDigest: true,
        lastUpdated: new Date()
      };
    }
    
    return preferences[0];
  } catch (error) {
    console.error('Error getting email preferences:', error);
    return null;
  }
} 