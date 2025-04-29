import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import sql from 'mssql';

export async function GET(request: Request) {
  try {
    console.log('Database info API endpoint called');
    
    // Get SQL Server version
    const versionResult = await executeQuery<{version: string}>(`
      SELECT @@VERSION as version
    `);
    
    // Get database name
    const databaseResult = await executeQuery<{database_name: string}>(`
      SELECT DB_NAME() as database_name
    `);
    
    // Get SQL Server connection info
    const connectionInfo = {
      user: process.env.MSSQL_USER || 'unknown',
      server: process.env.MSSQL_SERVER || 'unknown',
      database: process.env.MSSQL_DATABASE || 'unknown',
      port: process.env.MSSQL_PORT || '1433'
    };
    
    // List all tables in the database
    const tables = await executeQuery<{table_name: string, row_count: number}>(`
      SELECT 
        t.NAME AS table_name,
        p.rows AS row_count
      FROM 
        sys.tables t
      INNER JOIN 
        sys.indexes i ON t.OBJECT_ID = i.object_id
      INNER JOIN 
        sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
      WHERE 
        i.index_id <= 1
      ORDER BY 
        t.NAME
    `);
    
    // List all stored procedures
    const procedures = await executeQuery<{procedure_name: string, created_date: Date}>(`
      SELECT 
        ROUTINE_NAME as procedure_name, 
        CREATED as created_date
      FROM 
        INFORMATION_SCHEMA.ROUTINES
      WHERE 
        ROUTINE_TYPE = 'PROCEDURE' 
        AND SPECIFIC_SCHEMA = 'dbo'
      ORDER BY 
        ROUTINE_NAME
    `);
    
    // Check SQL version
    const versionString = versionResult[0]?.version || '';
    const versionMatch = versionString.match(/(\d+\.\d+\.\d+)/);
    const sqlVersion = versionMatch ? versionMatch[1] : 'Unknown';
    
    // Return the database information
    return NextResponse.json({
      success: true,
      serverInfo: {
        version: sqlVersion,
        fullVersion: versionString,
        database: databaseResult[0]?.database_name,
        connection: {
          ...connectionInfo,
          password: '******' // Mask password for security
        }
      },
      tables: tables.map(t => ({
        name: t.table_name,
        rowCount: t.row_count
      })),
      procedures: procedures.map(p => ({
        name: p.procedure_name,
        createdDate: p.created_date
      }))
    });
    
  } catch (error) {
    console.error('Error getting database info:', error);
    
    // Determine if it's a connection issue
    let errorMessage = 'Unknown error';
    let errorCode = 'UNKNOWN';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error instanceof sql.RequestError) {
        errorCode = error.code || 'UNKNOWN';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error getting database info',
      details: errorMessage,
      code: errorCode,
      connectionInfo: {
        user: process.env.MSSQL_USER || 'unknown',
        server: process.env.MSSQL_SERVER || 'unknown',
        database: process.env.MSSQL_DATABASE || 'unknown',
        port: process.env.MSSQL_PORT || '1433'
      }
    }, { status: 500 });
  }
} 