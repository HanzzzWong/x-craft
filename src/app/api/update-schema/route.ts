import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('Starting schema update...');
    
    // Check if Projects table exists
    const projectsTable = await executeQuery<{ exists: number }>(`
      IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Projects')
        SELECT 1 as exists
      ELSE
        SELECT 0 as exists
    `);
    
    if (!projectsTable[0]?.exists) {
      return NextResponse.json({
        success: false,
        message: 'Projects table does not exist'
      }, { status: 404 });
    }
    
    // Get columns that currently exist in Projects table
    const columns = await executeQuery<{ COLUMN_NAME: string }>(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Projects'
    `);
    
    const columnNames = columns.map(c => c.COLUMN_NAME.toLowerCase());
    console.log('Existing columns:', columnNames);
    
    // Track changes
    const changes = [];
    
    // Check for missing columns and add them
    if (!columnNames.includes('created_at')) {
      await executeQuery(`
        ALTER TABLE Projects
        ADD created_at DATETIME DEFAULT GETDATE()
      `);
      changes.push('Added created_at column');
    }
    
    if (!columnNames.includes('updated_at')) {
      await executeQuery(`
        ALTER TABLE Projects
        ADD updated_at DATETIME DEFAULT GETDATE()
      `);
      changes.push('Added updated_at column');
    }
    
    // Check if foreign key between Projects and Users exists
    try {
      const fkExists = await executeQuery<{ hasFk: number }>(`
        SELECT COUNT(*) as hasFk
        FROM sys.foreign_keys
        WHERE 
          OBJECT_NAME(parent_object_id) = 'Projects'
          AND OBJECT_NAME(referenced_object_id) = 'Users'
      `);
      
      // If no foreign key exists, check if the Users table exists
      if (fkExists[0]?.hasFk === 0) {
        const usersTable = await executeQuery<{ exists: number }>(`
          IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
            SELECT 1 as exists
          ELSE
            SELECT 0 as exists
        `);
        
        if (usersTable[0]?.exists) {
          // Check if both Projects.uid and Users.uid are compatible
          const uidColumns = await executeQuery<{ tableName: string, dataType: string, charMaxLength: number }>(`
            SELECT 
              TABLE_NAME as tableName,
              DATA_TYPE as dataType,
              CHARACTER_MAXIMUM_LENGTH as charMaxLength
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE 
              COLUMN_NAME = 'uid' 
              AND TABLE_NAME IN ('Projects', 'Users')
          `);
          
          const projectsUid = uidColumns.find(c => c.tableName === 'Projects');
          const usersUid = uidColumns.find(c => c.tableName === 'Users');
          
          if (projectsUid && usersUid && 
              projectsUid.dataType === usersUid.dataType && 
              projectsUid.charMaxLength === usersUid.charMaxLength) {
            // Types match, try to add foreign key
            try {
              await executeQuery(`
                ALTER TABLE Projects
                ADD CONSTRAINT FK_Projects_Users FOREIGN KEY (uid)
                REFERENCES Users(uid)
              `);
              changes.push('Added foreign key constraint between Projects and Users');
            } catch (fkError) {
              console.error('Error adding foreign key:', fkError);
              changes.push('Failed to add foreign key: ' + (fkError instanceof Error ? fkError.message : String(fkError)));
            }
          } else {
            changes.push('Cannot add foreign key - uid columns in Projects and Users have different types');
          }
        } else {
          changes.push('Cannot add foreign key - Users table does not exist');
        }
      } else {
        changes.push('Foreign key between Projects and Users already exists');
      }
    } catch (fkCheckError) {
      console.error('Error checking foreign keys:', fkCheckError);
      changes.push('Error checking foreign keys: ' + (fkCheckError instanceof Error ? fkCheckError.message : String(fkCheckError)));
    }
    
    // Add CASCADE DELETE to ProjectItems foreign key if it exists but doesn't have CASCADE
    try {
      // First check if the table exists
      const itemsTable = await executeQuery<{ exists: number }>(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProjectItems')
          SELECT 1 as exists
        ELSE
          SELECT 0 as exists
      `);
      
      if (itemsTable[0]?.exists) {
        // Check if foreign key exists but without CASCADE
        const fkInfo = await executeQuery<{ name: string, delete_referential_action: number }>(`
          SELECT 
            f.name,
            f.delete_referential_action
          FROM 
            sys.foreign_keys f
          INNER JOIN 
            sys.objects o ON f.parent_object_id = o.object_id
          WHERE 
            o.name = 'ProjectItems'
        `);
        
        // If foreign key exists but doesn't have CASCADE (delete_referential_action = 2)
        const nonCascadeFKs = fkInfo.filter(fk => fk.delete_referential_action !== 2);
        
        if (nonCascadeFKs.length > 0) {
          for (const fk of nonCascadeFKs) {
            try {
              // Drop existing FK
              await executeQuery(`
                ALTER TABLE ProjectItems
                DROP CONSTRAINT ${fk.name}
              `);
              
              // Add new FK with CASCADE
              await executeQuery(`
                ALTER TABLE ProjectItems
                ADD CONSTRAINT ${fk.name} FOREIGN KEY (project_id)
                REFERENCES Projects(id) ON DELETE CASCADE
              `);
              
              changes.push(`Updated foreign key ${fk.name} to include ON DELETE CASCADE`);
            } catch (fkError) {
              console.error(`Error updating foreign key ${fk.name}:`, fkError);
              changes.push(`Failed to update foreign key ${fk.name}: ${fkError instanceof Error ? fkError.message : String(fkError)}`);
            }
          }
        }
      }
    } catch (cascadeError) {
      console.error('Error configuring CASCADE DELETE:', cascadeError);
      changes.push('Error configuring CASCADE DELETE: ' + (cascadeError instanceof Error ? cascadeError.message : String(cascadeError)));
    }
    
    // Do the same for ProjectSteps
    try {
      const stepsTable = await executeQuery<{ exists: number }>(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProjectSteps')
          SELECT 1 as exists
        ELSE
          SELECT 0 as exists
      `);
      
      if (stepsTable[0]?.exists) {
        const fkInfo = await executeQuery<{ name: string, delete_referential_action: number }>(`
          SELECT 
            f.name,
            f.delete_referential_action
          FROM 
            sys.foreign_keys f
          INNER JOIN 
            sys.objects o ON f.parent_object_id = o.object_id
          WHERE 
            o.name = 'ProjectSteps'
        `);
        
        const nonCascadeFKs = fkInfo.filter(fk => fk.delete_referential_action !== 2);
        
        if (nonCascadeFKs.length > 0) {
          for (const fk of nonCascadeFKs) {
            try {
              await executeQuery(`
                ALTER TABLE ProjectSteps
                DROP CONSTRAINT ${fk.name}
              `);
              
              await executeQuery(`
                ALTER TABLE ProjectSteps
                ADD CONSTRAINT ${fk.name} FOREIGN KEY (project_id)
                REFERENCES Projects(id) ON DELETE CASCADE
              `);
              
              changes.push(`Updated foreign key ${fk.name} to include ON DELETE CASCADE`);
            } catch (fkError) {
              console.error(`Error updating foreign key ${fk.name}:`, fkError);
              changes.push(`Failed to update foreign key ${fk.name}: ${fkError instanceof Error ? fkError.message : String(fkError)}`);
            }
          }
        }
      }
    } catch (cascadeError) {
      console.error('Error configuring CASCADE DELETE for ProjectSteps:', cascadeError);
      changes.push('Error configuring CASCADE DELETE for ProjectSteps: ' + (cascadeError instanceof Error ? cascadeError.message : String(cascadeError)));
    }
    
    if (changes.length === 0) {
      changes.push('No schema changes needed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schema update completed',
      changes
    });
  } catch (error) {
    console.error('Error updating schema:', error);
    return NextResponse.json({
      success: false,
      message: 'Error updating schema',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 