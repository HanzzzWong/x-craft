import { NextResponse } from 'next/server';
import sql from 'mssql';

// Get environment variables
const sqlConfig = {
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  server: process.env.MSSQL_SERVER || '',
  database: process.env.MSSQL_DATABASE || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 15000,
  }
};

export async function GET() {
  const results = {
    environmentCheck: {},
    connectionTest: {},
    usersTableTest: {},
    diagnostics: [],
    recommendations: []
  };
  
  try {
    // 1. Check environment variables
    results.environmentCheck = {
      user: Boolean(sqlConfig.user),
      password: Boolean(sqlConfig.password),
      server: Boolean(sqlConfig.server),
      database: Boolean(sqlConfig.database),
      values: {
        user: sqlConfig.user,
        server: sqlConfig.server,
        database: sqlConfig.database
      }
    };
    
    if (!sqlConfig.user || !sqlConfig.password || !sqlConfig.server || !sqlConfig.database) {
      results.diagnostics.push('Missing required database environment variables');
      results.recommendations.push('Make sure your .env.local file contains MSSQL_USER, MSSQL_PASSWORD, MSSQL_SERVER, and MSSQL_DATABASE');
      
      return NextResponse.json(results);
    }
    
    // 2. Test raw connection (without pool)
    try {
      console.log('Testing direct SQL connection');
      const conn = new sql.ConnectionPool(sqlConfig);
      await conn.connect();
      
      results.connectionTest = {
        success: true,
        message: 'Successfully connected to database server'
      };
      
      // 3. Check if Users table exists
      try {
        const request = new sql.Request(conn);
        const tableCheck = await request.query(`
          SELECT CASE 
            WHEN EXISTS (
              SELECT * FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_NAME = 'Users'
            ) 
            THEN 1 ELSE 0 
          END as usersTableExists
        `);
        
        const usersTableExists = tableCheck.recordset[0].usersTableExists === 1;
        
        results.usersTableTest = {
          exists: usersTableExists,
          message: usersTableExists ? 'Users table exists' : 'Users table does not exist'
        };
        
        if (!usersTableExists) {
          results.diagnostics.push('Users table is missing');
          
          // Try to create the Users table
          try {
            await request.query(`
              CREATE TABLE Users (
                uid VARCHAR(50) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) NULL,
                user_type VARCHAR(20) DEFAULT 'personal',
                created_at DATETIME NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME NULL
              )
            `);
            
            results.diagnostics.push('Successfully created Users table');
            results.usersTableTest.created = true;
            
            // Add a test user
            const uid = `test-${Date.now()}`;
            await request.query(`
              INSERT INTO Users (uid, email, password, name, created_at)
              VALUES ('${uid}', 'test@example.com', 'test-password-hash', 'Test User', GETDATE())
            `);
            
            results.diagnostics.push('Created a test user');
          } catch (createError) {
            results.diagnostics.push(`Failed to create Users table: ${createError.message}`);
            results.recommendations.push('You need to manually create the Users table or check database permissions');
          }
        } else {
          // Check if there are any users
          const userCountResult = await request.query('SELECT COUNT(*) as count FROM Users');
          const userCount = userCountResult.recordset[0].count;
          
          results.usersTableTest.userCount = userCount;
          
          if (userCount === 0) {
            results.diagnostics.push('Users table exists but has no records');
            results.recommendations.push('Register a user to populate the Users table');
          } else {
            results.diagnostics.push(`Users table exists with ${userCount} user(s)`);
          }
        }
      } catch (tableError) {
        results.usersTableTest = {
          error: true,
          message: `Error checking Users table: ${tableError.message}`
        };
        
        results.diagnostics.push(`Error checking/creating Users table: ${tableError.message}`);
        results.recommendations.push('Verify database permissions or connection string');
      }
      
      await conn.close();
      
    } catch (connError) {
      results.connectionTest = {
        success: false,
        message: `Failed to connect to database: ${connError.message}`,
        error: connError
      };
      
      results.diagnostics.push(`Database connection failed: ${connError.message}`);
      results.recommendations.push('Check your database server address and credentials');
      results.recommendations.push('Verify that your database server is running and accessible from your application server');
    }
    
    // Add final recommendations
    if (results.diagnostics.some(d => d.includes('missing') || d.includes('failed') || d.includes('error'))) {
      results.recommendations.push('Create a .env.local file with these variables:');
      results.recommendations.push(`MSSQL_USER=${sqlConfig.user || 'your_username'}`);
      results.recommendations.push(`MSSQL_PASSWORD=your_password`);
      results.recommendations.push(`MSSQL_SERVER=${sqlConfig.server || 'your_server_address'}`);
      results.recommendations.push(`MSSQL_DATABASE=${sqlConfig.database || 'your_database_name'}`);
      results.recommendations.push(`JWT_SECRET=any_random_string_for_tokens`);
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: true,
      message: `Unexpected error during auth test: ${error.message}`,
      stack: error.stack,
      results
    }, { status: 500 });
  }
} 