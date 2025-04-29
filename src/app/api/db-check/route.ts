import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface TableCounts {
  [key: string]: number | string;
}

export async function GET(request: Request) {
  try {
    console.log('Database check API endpoint called');
    
    // Check database connection
    console.log('Checking database connection...');
    
    // Get database version
    const versionResult = await executeQuery<{version: string}>(`
      SELECT @@VERSION as version
    `);
    
    // Check tables
    const tables = await executeQuery<{table_name: string}>(`
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = DB_NAME()
      ORDER BY TABLE_NAME
    `);
    
    // Get Users table structure if it exists
    let usersTableColumns: ColumnInfo[] = [];
    if (tables.some(t => t.table_name === 'Users')) {
      usersTableColumns = await executeQuery<ColumnInfo>(`
        SELECT 
          COLUMN_NAME as column_name, 
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Users'
        ORDER BY ORDINAL_POSITION
      `);
    }
    
    // Get Projects table structure if it exists
    let projectsTableColumns: ColumnInfo[] = [];
    let projectsIdIsIdentity = false;
    
    if (tables.some(t => t.table_name === 'Projects')) {
      projectsTableColumns = await executeQuery<ColumnInfo>(`
        SELECT 
          COLUMN_NAME as column_name, 
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Projects'
        ORDER BY ORDINAL_POSITION
      `);
      
      // Check if id is an identity column
      const idInfo = await executeQuery<{is_identity: boolean}>(`
        SELECT COLUMNPROPERTY(OBJECT_ID('Projects'), 'id', 'IsIdentity') as is_identity
      `);
      
      projectsIdIsIdentity = idInfo[0]?.is_identity === true;
    }
    
    // Get counts from tables
    const counts: TableCounts = {};
    for (const table of tables) {
      try {
        const countResult = await executeQuery<{count: number}>(`
          SELECT COUNT(*) as count FROM [${table.table_name}]
        `);
        counts[table.table_name] = countResult[0]?.count || 0;
      } catch (error: any) {
        counts[table.table_name] = `Error counting: ${error.message}`;
      }
    }
    
    // Get stored procedures
    const procedures = await executeQuery<{procedure_name: string}>(`
      SELECT ROUTINE_NAME as procedure_name
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE' AND SPECIFIC_SCHEMA = 'dbo'
      ORDER BY ROUTINE_NAME
    `);
    
    // Get 5 recent projects if they exist
    let recentProjects: any[] = [];
    if (tables.some(t => t.table_name === 'Projects')) {
      try {
        recentProjects = await executeQuery(`
          SELECT TOP 5 id, uid, title, project_type, completed_at, created_at
          FROM Projects
          ORDER BY created_at DESC
        `);
      } catch (error) {
        console.error('Error fetching recent projects:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      database: {
        version: versionResult[0]?.version,
        tables: tables.map(t => t.table_name),
        tableCounts: counts,
        procedures: procedures.map(p => p.procedure_name)
      },
      usersTable: {
        columns: usersTableColumns
      },
      projectsTable: {
        columns: projectsTableColumns,
        idIsIdentity: projectsIdIsIdentity
      },
      recentProjects
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error checking database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 