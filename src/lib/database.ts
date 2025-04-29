// Database connection module for SQL Server
import sql from 'mssql';
import './server-only'; // Mark this file as server-only

// Configuration for SQL Server connection
const sqlConfig = {
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  server: process.env.MSSQL_SERVER || '',
  database: process.env.MSSQL_DATABASE || '',
  options: {
    encrypt: true, // For Azure SQL
    trustServerCertificate: true, // For local dev / self-signed certs
    connectTimeout: 30000, // 30 second timeout
    requestTimeout: 30000, // 30 second timeout for queries
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Add a function to test database connection
export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection with config:', {
      user: sqlConfig.user,
      server: sqlConfig.server,
      database: sqlConfig.database
    });
    
    const testPool = new sql.ConnectionPool({
      ...sqlConfig,
      options: {
        ...sqlConfig.options,
        connectTimeout: 10000 // Shorter timeout for test
      }
    });
    
    const connection = await testPool.connect();
    console.log('Test connection successful!');
    
    // Test a simple query
    const request = new sql.Request(connection);
    const result = await request.query('SELECT @@VERSION as version');
    console.log(`SQL Server version: ${result.recordset[0].version.split('\n')[0]}`);
    
    // Check for Projects table
    const tableResult = await request.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Projects'
    `);
    
    if (tableResult.recordset.length > 0) {
      console.log('Projects table exists');
      
      // Check Projects table structure
      const columnsResult = await request.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Projects'
      `);
      
      console.log('Projects table structure:');
      columnsResult.recordset.forEach(column => {
        console.log(`- ${column.COLUMN_NAME}: ${column.DATA_TYPE} (${column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('Projects table does not exist');
    }
    
    // Check Users table
    const usersResult = await request.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Users'
    `);
    
    if (usersResult.recordset[0].count > 0) {
      console.log('Users table exists');
      
      // Check if there are any users
      const userCountResult = await request.query('SELECT COUNT(*) as count FROM Users');
      console.log(`Users table has ${userCountResult.recordset[0].count} records`);
    } else {
      console.log('Users table does not exist');
    }
    
    await connection.close();
    return { success: true, message: 'Database connection test successful' };
  } catch (error: any) {
    console.error('Database connection test failed:', {
      message: error.message,
      code: error.code,
      number: error.number
    });
    return { 
      success: false, 
      message: `Database connection test failed: ${error.message}`,
      error
    };
  }
}

// Pool to reuse connections
let pool: sql.ConnectionPool | null = null;

// Connect to SQL Server database
export async function initializeDatabase() {
  try {
    if (!pool) {
      console.log('Creating new SQL connection pool with config:', {
        user: sqlConfig.user,
        server: sqlConfig.server,
        database: sqlConfig.database,
        encrypt: sqlConfig.options.encrypt,
        trustServerCertificate: sqlConfig.options.trustServerCertificate
      });
      
      // Add retry logic for connection
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          pool = await new sql.ConnectionPool(sqlConfig).connect();
          console.log('Successfully connected to SQL Server database');
          
          // Test the connection with a simple query
          const request = new sql.Request(pool);
          const result = await request.query('SELECT @@VERSION as version');
          console.log(`Connected to SQL Server: ${result.recordset[0].version.split('\n')[0]}`);
          
          return pool;
        } catch (connError: any) {
          retryCount++;
          console.error(`Connection attempt ${retryCount} failed:`, {
            message: connError.message,
            code: connError.code,
            number: connError.number
          });
          
          if (retryCount >= maxRetries) {
            console.error('Maximum connection retry attempts reached');
            throw connError;
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    return pool;
  } catch (error: any) {
    console.error('Error connecting to SQL Server database:', {
      message: error.message,
      code: error.code, 
      number: error.number,
      stack: error.stack
    });
    
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Close connection to database
export async function closeDatabase() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Connection to SQL Server database closed');
    }
  } catch (error) {
    console.error('Error closing SQL Server database connection:', error);
    throw error;
  }
}

// Get SQL pool or create a new connection
async function getPool() {
  if (!pool) {
    await initializeDatabase();
  }
  return pool!;
}

// Execute a SQL query
export async function executeQuery<T>(query: string, params: any = {}): Promise<T[]> {
  try {
    // Mask password in logs if it's included in params
    const loggableParams = { ...params };
    if (loggableParams.password) {
      loggableParams.password = '******';
    }
    
    // Log query execution (first 100 chars of query to avoid huge logs)
    const truncatedQuery = query.length > 100 ? query.substring(0, 100) + '...' : query;
    console.log(`Executing query: ${truncatedQuery}`);
    console.log('Query parameters:', loggableParams);
    
    // Get connection pool
    const pool = await getPool();
    const request = new sql.Request(pool);
    
    // Add parameters to the request
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        request.input(key, params[key]);
      }
    }
    
    // Execute the query with timeout tracking
    const startTime = Date.now();
    const result = await request.query<T>(query);
    const duration = Date.now() - startTime;
    
    // Check if this is a SELECT query that returns records or a modification query
    if (result.recordset) {
      // Log success with row count for SELECT queries
      console.log(`Query executed successfully in ${duration}ms, returning ${result.recordset.length} rows`);
      return result.recordset;
    } else {
      // Log success for non-SELECT queries (INSERT, UPDATE, DELETE)
      console.log(`Query executed successfully in ${duration}ms, rows affected: ${result.rowsAffected[0]}`);
      return [] as T[]; // Return empty array for modification queries
    }
  } catch (error: any) {
    // Enhanced error logging with query details
    console.error('Error executing SQL query:', error);
    console.error('Query that failed:', query);
    
    // Mask password in logs if it's included in params
    const loggableParams = { ...params };
    if (loggableParams.password) {
      loggableParams.password = '******';
    }
    console.error('Query parameters:', loggableParams);
    
    // Add specific error handling for common connection issues
    if (error.code === 'ETIMEOUT') {
      throw new Error('Database connection timed out. Please try again later.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Could not connect to database. Please try again later.');
    } else if (error.message && error.message.includes('Login failed')) {
      throw new Error('Database authentication failed. Please contact support.');
    }
    
    throw error;
  }
}

// Execute a stored procedure
export async function executeStoredProcedure(procedure: string, params: any = {}): Promise<sql.IProcedureResult<any>> {
  try {
    const pool = await getPool();
    const request = new sql.Request(pool);
    
    // Add parameters to the request
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        request.input(key, params[key]);
      }
    }
    
    const result = await request.execute(procedure);
    return result;
  } catch (error) {
    console.error(`Error executing stored procedure ${procedure}:`, error);
    throw error;
  }
} 