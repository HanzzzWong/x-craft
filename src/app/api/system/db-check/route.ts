import { NextResponse } from 'next/server';
import { initializeDatabase, executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('Verifying database connection...');
    
    // Try to connect to the database
    await initializeDatabase();
    
    // Check if Users table exists
    const tables = await executeQuery<{TableName: string}>(`
      SELECT TABLE_NAME as TableName 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Users'
    `);
    
    const usersTableExists = tables.length > 0;
    
    // Check Users table columns (if it exists)
    let userColumns: {ColumnName: string, DataType: string}[] = [];
    
    if (usersTableExists) {
      userColumns = await executeQuery<{ColumnName: string, DataType: string}>(`
        SELECT COLUMN_NAME as ColumnName, DATA_TYPE as DataType
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Users'
        ORDER BY ORDINAL_POSITION
      `);
    }
    
    // Check if there are any users in the database (if table exists)
    let userCount = 0;
    
    if (usersTableExists) {
      const countResult = await executeQuery<{count: number}>(`
        SELECT COUNT(*) as count FROM Users
      `);
      
      userCount = countResult[0]?.count || 0;
    }
    
    // Return database status
    return NextResponse.json({
      connected: true,
      environment: {
        database: process.env.MSSQL_DATABASE || 'Not set',
        server: process.env.MSSQL_SERVER || 'Not set',
        // Don't reveal sensitive credentials
        hasUserSet: !!process.env.MSSQL_USER,
        hasPasswordSet: !!process.env.MSSQL_PASSWORD,
      },
      schema: {
        usersTableExists,
        userColumns: userColumns.map(col => ({
          name: col.ColumnName,
          type: col.DataType
        })),
        userCount
      }
    });
  } catch (error: any) {
    console.error('Database check failed:', error);
    
    return NextResponse.json(
      { 
        connected: false,
        error: error.message || 'Unknown database error',
        environment: {
          database: process.env.MSSQL_DATABASE || 'Not set',
          server: process.env.MSSQL_SERVER || 'Not set',
          // Don't reveal sensitive credentials
          hasUserSet: !!process.env.MSSQL_USER,
          hasPasswordSet: !!process.env.MSSQL_PASSWORD,
        }
      },
      { status: 500 }
    );
  }
} 