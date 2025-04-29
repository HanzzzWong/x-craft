import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/database';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('Starting database test API route');
    
    // Test basic database connectivity
    const testResult = await testDatabaseConnection();
    
    if (!testResult.success) {
      console.error('Database connection test failed:', testResult.message);
      return NextResponse.json({
        success: false,
        message: 'Database connection test failed',
        details: testResult.message
      }, { status: 500 });
    }
    
    // Test query execution
    try {
      const envInfo = {
        user: process.env.MSSQL_USER,
        server: process.env.MSSQL_SERVER,
        database: process.env.MSSQL_DATABASE,
        hasPassword: Boolean(process.env.MSSQL_PASSWORD)
      };
      
      console.log('Environment variables:', envInfo);
      
      // Check all tables
      const tables = await executeQuery<{TABLE_NAME: string}>(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      
      // Try to detect common schema issues
      let schemaIssues = [];
      
      // 1. Check if Users table exists
      if (!tables.some(t => t.TABLE_NAME === 'Users')) {
        schemaIssues.push('Users table is missing');
      } else {
        // Check Users schema
        const usersColumns = await executeQuery<{COLUMN_NAME: string}>(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Users'
        `);
        
        if (!usersColumns.some(c => c.COLUMN_NAME === 'uid')) {
          schemaIssues.push('Users table is missing uid column');
        }
      }
      
      // 2. Check if Projects table exists
      if (!tables.some(t => t.TABLE_NAME === 'Projects')) {
        schemaIssues.push('Projects table is missing');
      } else {
        // Check Projects schema
        const projectsColumns = await executeQuery<{COLUMN_NAME: string, IS_NULLABLE: string}>(`
          SELECT COLUMN_NAME, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Projects'
        `);
        
        // Check for required columns
        const requiredColumns = ['id', 'uid', 'title', 'description', 'completed_at'];
        for (const col of requiredColumns) {
          if (!projectsColumns.some(c => c.COLUMN_NAME.toLowerCase() === col.toLowerCase())) {
            schemaIssues.push(`Projects table is missing ${col} column`);
          }
        }
        
        // Check for columns that should be nullable
        const nullableColumns = await executeQuery<{COLUMN_NAME: string, IS_NULLABLE: string}>(`
          SELECT COLUMN_NAME, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Projects' AND COLUMN_NAME IN ('created_at', 'updated_at', 'project_type')
        `);
        
        for (const col of nullableColumns) {
          if (col.IS_NULLABLE === 'NO' && (col.COLUMN_NAME === 'created_at' || col.COLUMN_NAME === 'updated_at')) {
            schemaIssues.push(`Column ${col.COLUMN_NAME} in Projects should allow NULL values`);
          }
        }
      }
      
      // 3. Check Project Items
      if (!tables.some(t => t.TABLE_NAME === 'ProjectItems')) {
        schemaIssues.push('ProjectItems table is missing');
      }
      
      // 4. Check Project Steps
      if (!tables.some(t => t.TABLE_NAME === 'ProjectSteps')) {
        schemaIssues.push('ProjectSteps table is missing');
      }
      
      // 5. Check foreign key constraints
      try {
        const foreignKeys = await executeQuery<{name: string, parent_table: string, referenced_table: string}>(`
          SELECT 
            fk.name,
            OBJECT_NAME(fk.parent_object_id) as parent_table,
            OBJECT_NAME(fk.referenced_object_id) as referenced_table
          FROM 
            sys.foreign_keys fk
          WHERE 
            OBJECT_NAME(fk.parent_object_id) IN ('Projects', 'ProjectItems', 'ProjectSteps')
        `);
        
        // Check project foreign keys
        const projectUserFK = foreignKeys.find(fk => 
          fk.parent_table === 'Projects' && fk.referenced_table === 'Users'
        );
        
        if (!projectUserFK) {
          schemaIssues.push('Missing foreign key between Projects and Users tables');
        }
        
        const itemsProjectFK = foreignKeys.find(fk => 
          fk.parent_table === 'ProjectItems' && fk.referenced_table === 'Projects'
        );
        
        if (!itemsProjectFK) {
          schemaIssues.push('Missing foreign key between ProjectItems and Projects tables');
        }
        
        const stepsProjectFK = foreignKeys.find(fk => 
          fk.parent_table === 'ProjectSteps' && fk.referenced_table === 'Projects'
        );
        
        if (!stepsProjectFK) {
          schemaIssues.push('Missing foreign key between ProjectSteps and Projects tables');
        }
      } catch (fkError) {
        console.error('Error checking foreign keys:', fkError);
        schemaIssues.push('Unable to check foreign key constraints: ' + (fkError instanceof Error ? fkError.message : String(fkError)));
      }
      
      // 6. Try to create a sample user if no users exist
      let testUserCreated = false;
      try {
        const userCount = await executeQuery<{count: number}>(`
          SELECT COUNT(*) as count FROM Users
        `);
        
        if (userCount[0].count === 0) {
          const testUserId = 'test-' + Date.now();
          await executeQuery(`
            INSERT INTO Users (uid, email, password, name, created_at)
            VALUES (@uid, @email, @password, @name, @createdAt)
          `, {
            uid: testUserId,
            email: 'test@example.com',
            password: 'password-hash',
            name: 'Test User',
            createdAt: new Date()
          });
          
          testUserCreated = true;
          console.log('Created test user with ID:', testUserId);
        }
      } catch (userError) {
        console.error('Error creating test user:', userError);
        schemaIssues.push('Unable to create test user: ' + (userError instanceof Error ? userError.message : String(userError)));
      }
      
      return NextResponse.json({
        success: true,
        testResult,
        tables: tables.map(t => t.TABLE_NAME),
        schemaIssues: schemaIssues.length > 0 ? schemaIssues : 'No schema issues detected',
        testUserCreated,
        environment: envInfo
      });
    } catch (queryError) {
      console.error('Error executing diagnostic queries:', queryError);
      return NextResponse.json({
        success: false,
        message: 'Database query execution failed',
        details: queryError instanceof Error ? queryError.message : String(queryError),
        connectionTest: testResult
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DB test route:', error);
    return NextResponse.json({
      success: false,
      message: 'Database test failed with an unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 