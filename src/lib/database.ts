// Database connection module for SQL Server
import sql from 'mssql';
import './server-only'; // Mark this file as server-only

// Function to validate database configuration
function validateDatabaseConfig() {
  const missingVars = [];
  if (!process.env.MSSQL_USER) missingVars.push('MSSQL_USER');
  if (!process.env.MSSQL_PASSWORD) missingVars.push('MSSQL_PASSWORD');
  if (!process.env.MSSQL_SERVER) missingVars.push('MSSQL_SERVER');
  if (!process.env.MSSQL_DATABASE) missingVars.push('MSSQL_DATABASE');

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env.local file and ensure these variables are set correctly.');
    return { isValid: false, missingVars };
  }

  // Log masked configuration to help with debugging
  console.log('Database configuration:', {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD ? '******' : '[NOT SET]',
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE
  });
  
  return { isValid: true };
}

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
    console.log('Starting comprehensive database diagnostics test');
    
    // Detailed diagnostics object
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      connectionStatus: 'pending',
      configuration: {
        user: process.env.MSSQL_USER ? '✓ Present' : '✗ Missing',
        password: process.env.MSSQL_PASSWORD ? '✓ Present' : '✗ Missing',
        server: process.env.MSSQL_SERVER,
        database: process.env.MSSQL_DATABASE,
        port: process.env.MSSQL_PORT || '1433',
        encrypt: sqlConfig.options.encrypt,
        trustServerCertificate: sqlConfig.options.trustServerCertificate
      },
      serverInfo: {
        version: null,
        edition: null,
        instanceName: null,
        productVersion: null
      },
      tables: {},
      storedProcedures: [],
      permissions: {},
      networkInfo: {
        dnsResolved: false,
        canConnect: false,
        connectionTime: null,
        timeoutValue: sqlConfig.options.connectTimeout
      },
      recommendations: []
    };
    
    // Validate config before testing
    const configValidation = validateDatabaseConfig();
    if (!configValidation.isValid) {
      diagnostics.connectionStatus = 'failed';
      diagnostics.error = 'Missing configuration variables';
      diagnostics.missingVars = configValidation.missingVars;
      
      diagnostics.recommendations.push(
        'Check your .env.local file and ensure all database variables are set correctly',
        'Make sure you have created a .env.local file in your project root',
        'Required variables are: MSSQL_USER, MSSQL_PASSWORD, MSSQL_SERVER, MSSQL_DATABASE'
      );
      
      return { 
        success: false, 
        message: 'Database configuration validation failed',
        error: 'Missing configuration variables',
        config: diagnostics.configuration,
        missingVars: configValidation.missingVars,
        diagnostics
      };
    }
    
    console.log('Testing database connection with config:', {
      user: sqlConfig.user,
      server: sqlConfig.server,
      database: sqlConfig.database
    });
    
    // Create a test pool with shorter timeout for diagnostics
    const testPool = new sql.ConnectionPool({
      ...sqlConfig,
      options: {
        ...sqlConfig.options,
        connectTimeout: 10000 // Shorter timeout for test
      }
    });
    
    // Try to connect to the database
    const connection = await testPool.connect();
    
    // If we reach here, connection was successful
    console.log('Database connection successful!');
    diagnostics.connectionStatus = 'connected';
    diagnostics.networkInfo.canConnect = true;
    diagnostics.networkInfo.connectionTime = Date.now();
    
    // Initialize the diagnostics request
    const request = new sql.Request(connection);
    
    // Test SQL Server version and instance info
    console.log('Querying SQL Server version and instance information');
    const versionResult = await request.query(`
      SELECT 
        @@VERSION as version,
        SERVERPROPERTY('Edition') as edition,
        SERVERPROPERTY('InstanceName') as instanceName,
        SERVERPROPERTY('ProductVersion') as productVersion,
        DB_NAME() as currentDatabase
    `);
    
    if (versionResult.recordset.length > 0) {
      const versionInfo = versionResult.recordset[0];
      diagnostics.serverInfo = {
        version: versionInfo.version.split('\n')[0],
        edition: versionInfo.edition || 'Unknown',
        instanceName: versionInfo.instanceName || 'Default',
        productVersion: versionInfo.productVersion || 'Unknown',
        currentDatabase: versionInfo.currentDatabase
      };
      
      console.log(`SQL Server version: ${diagnostics.serverInfo.version}`);
      console.log(`SQL Server edition: ${diagnostics.serverInfo.edition}`);
      console.log(`SQL Server instance: ${diagnostics.serverInfo.instanceName}`);
      console.log(`Current database: ${diagnostics.serverInfo.currentDatabase}`);
    }
    
    // Check database permissions
    console.log('Checking database permissions');
    try {
      const permissionsResult = await request.query(`
        SELECT 
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'SELECT') as canSelect,
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') as canInsert,
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE') as canUpdate,
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE') as canDelete,
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'EXECUTE') as canExecute,
          HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CREATE TABLE') as canCreateTable
      `);
      
      if (permissionsResult.recordset.length > 0) {
        const perms = permissionsResult.recordset[0];
        diagnostics.permissions = {
          select: perms.canSelect === 1,
          insert: perms.canInsert === 1,
          update: perms.canUpdate === 1,
          delete: perms.canDelete === 1,
          execute: perms.canExecute === 1,
          createTable: perms.canCreateTable === 1
        };
        
        // Add recommendations if permissions are missing
        if (!diagnostics.permissions.execute) {
          diagnostics.recommendations.push(
            'The database user lacks EXECUTE permission, which is needed for stored procedures'
          );
        }
        
        if (!diagnostics.permissions.createTable) {
          diagnostics.recommendations.push(
            'The database user lacks CREATE TABLE permission, which may be needed for initial setup'
          );
        }
      }
    } catch (error) {
      console.warn('Could not check permissions:', error);
      diagnostics.permissions = { error: 'Could not check permissions' };
    }
    
    // Get all tables in the database
    console.log('Gathering information about key tables');
    const tablesToCheck = ['Users', 'Projects', 'ProjectItems', 'ProjectSteps'];
    
    for (const tableName of tablesToCheck) {
      console.log(`Checking table: ${tableName}`);
      
      // Check if table exists
      const tableExistsResult = await request.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = '${tableName}'
      `);
      
      const tableExists = tableExistsResult.recordset.length > 0;
      
      diagnostics.tables[tableName] = {
        exists: tableExists,
        columns: [],
        recordCount: 0
      };
      
      if (tableExists) {
        console.log(`Table ${tableName} exists, checking structure`);
        
        // Get column information
        const columnsResult = await request.query(`
          SELECT 
            COLUMN_NAME as name, 
            DATA_TYPE as type, 
            CHARACTER_MAXIMUM_LENGTH as maxLength,
            IS_NULLABLE as isNullable
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);
        
        // Transform column data for better readability
        diagnostics.tables[tableName].columns = columnsResult.recordset.map(col => ({
          name: col.name,
          type: col.maxLength ? `${col.type}(${col.maxLength === -1 ? 'MAX' : col.maxLength})` : col.type,
          nullable: col.isNullable === 'YES'
        }));
        
        // Get record count
        try {
          const countResult = await request.query(`SELECT COUNT(*) as count FROM [${tableName}]`);
          diagnostics.tables[tableName].recordCount = countResult.recordset[0].count;
          console.log(`Table ${tableName} has ${diagnostics.tables[tableName].recordCount} records`);
        } catch (error) {
          console.error(`Error getting record count for ${tableName}:`, error);
          diagnostics.tables[tableName].recordCount = -1;
          diagnostics.tables[tableName].countError = 'Could not count records';
        }
      } else {
        console.log(`Table ${tableName} does not exist`);
        
        // Add recommendation for missing table
        diagnostics.recommendations.push(
          `Table '${tableName}' is missing. Run the schema.sql script to create the required tables.`
        );
      }
    }
    
    // Check for stored procedures
    console.log('Checking stored procedures');
    const proceduresToCheck = [
      'GetProjectWithDetails', 
      'GetUserProjects', 
      'SaveProject', 
      'AddProjectItem', 
      'AddProjectStep'
    ];
    
    const storedProceduresResult = await request.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
    `);
    
    const existingProcedures = storedProceduresResult.recordset.map((p: any) => p.ROUTINE_NAME);
    
    diagnostics.storedProcedures = proceduresToCheck.map(procName => ({
      name: procName,
      exists: existingProcedures.includes(procName)
    }));
    
    // Check for missing procedures
    const missingProcedures = diagnostics.storedProcedures
      .filter((p: {name: string, exists: boolean}) => !p.exists)
      .map((p: {name: string, exists: boolean}) => p.name);
    
    if (missingProcedures.length > 0) {
      console.log(`Missing stored procedures: ${missingProcedures.join(', ')}`);
      diagnostics.recommendations.push(
        `Missing stored procedures: ${missingProcedures.join(', ')}. Run the schema.sql script to create them.`
      );
    }
    
    // Close the test connection
    await connection.close();
    console.log('Database diagnostics test completed successfully');
    
    return { 
      success: true, 
      message: 'Database connection test successful',
      diagnostics 
    };
  } catch (error) {
    // Handle specific error types to give better diagnostics
    console.error('Database connection test failed:', error);
    
    // Create error diagnostics with recommendations
    const errorDiagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      connectionStatus: 'failed',
      configuration: {
        user: process.env.MSSQL_USER ? '✓ Present' : '✗ Missing',
        password: process.env.MSSQL_PASSWORD ? '✓ Present' : '✗ Missing',
        server: process.env.MSSQL_SERVER,
        database: process.env.MSSQL_DATABASE,
        port: process.env.MSSQL_PORT || '1433'
      },
      error: {
        message: (error as Error).message,
        code: (error as any).code || 'UNKNOWN',
        possibleCauses: [],
        recommendations: []
      }
    };
    
    const errorCode = (error as any).code || '';
    const errorMessage = (error as Error).message || '';
    
    // Handle common SQL Server connection errors
    if (errorCode === 'ETIMEOUT' || errorMessage.includes('timeout')) {
      errorDiagnostics.error.possibleCauses = [
        'The SQL Server is not reachable at the specified address',
        'A firewall is blocking connections to the SQL Server',
        'The SQL Server is not running or is not accepting connections'
      ];
      
      errorDiagnostics.error.recommendations = [
        'Check if the server address is correct',
        'Verify that the SQL Server is running',
        'Check if your firewall is blocking the connection',
        'Try connecting to the server using SQL Server Management Studio',
        'Try increasing the connection timeout in the configuration'
      ];
    } 
    else if (errorCode === 'ELOGIN' || errorMessage.includes('Login failed')) {
      errorDiagnostics.error.possibleCauses = [
        'The username or password is incorrect',
        'The user does not have permission to access the database',
        'SQL Server is configured for Windows Authentication only'
      ];
      
      errorDiagnostics.error.recommendations = [
        'Verify that the username and password are correct',
        'Check if the user has access to the specified database',
        'Try connecting using SQL Server Management Studio with the same credentials',
        'Make sure SQL Server is configured to allow SQL Authentication'
      ];
    }
    else if (errorMessage.includes('database') && errorMessage.includes('exist')) {
      errorDiagnostics.error.possibleCauses = [
        'The specified database does not exist on the server',
        'The user does not have permission to access the database'
      ];
      
      errorDiagnostics.error.recommendations = [
        'Verify that the database name is correct',
        'Check if the database exists on the server',
        'Create the database if it does not exist',
        'Grant the user access to the database'
      ];
    }
    else {
      // Generic recommendations for other errors
      errorDiagnostics.error.possibleCauses = [
        'There may be a problem with the SQL Server configuration',
        'Network connectivity issues may be preventing the connection',
        'Environment variables might not be correctly loaded'
      ];
      
      errorDiagnostics.error.recommendations = [
        'Check all connection parameters (server, database, user, password)',
        'Verify that the SQL Server is running and accessible',
        'Check for any network issues between your application and the SQL Server',
        'Try connecting using SQL Server Management Studio to verify credentials'
      ];
    }
    
    return { 
      success: false, 
      message: `Database connection failed: ${errorMessage}`,
      error: errorDiagnostics.error,
      config: errorDiagnostics.configuration,
      diagnostics: errorDiagnostics
    };
  }
}

// Pool to reuse connections
let pool: sql.ConnectionPool | null = null;

// Connect to SQL Server database
export async function initializeDatabase() {
  try {
    // Validate database configuration first
    const isValid = validateDatabaseConfig();
    if (!isValid) {
      throw new Error('Database configuration validation failed. Check your environment variables.');
    }
    
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
    
    // Provide more helpful error messages based on common error codes
    if (error.code === 'ESOCKET') {
      throw new Error(`Database connection failed: Could not connect to the server at "${sqlConfig.server}". Please check if the server address is correct and the server is running.`);
    } else if (error.code === 'ELOGIN') {
      throw new Error(`Database connection failed: Login failed for user "${sqlConfig.user}". Please check your username and password.`);
    } else if (error.code === 'ETIMEOUT') {
      throw new Error(`Database connection failed: Connection timed out. The server may be unreachable or behind a firewall.`);
    } else {
      throw new Error(`Database connection failed: ${error.message}`);
    }
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
    console.log(`Executing stored procedure: ${procedure}`);
    console.log('Procedure parameters:', JSON.stringify(params, (key, value) => {
      // Mask password and convert dates to ISO strings for better logging
      if (key === 'password') return '******';
      if (value instanceof Date) return value.toISOString();
      return value;
    }, 2));
    
    const pool = await getPool();
    const request = new sql.Request(pool);
    
    // Add parameters to the request
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        request.input(key, params[key]);
        console.log(`Added parameter ${key}: ${typeof params[key]}`);
      }
    }
    
    try {
      // Try without schema prefix if it includes dbo.
      if (procedure.startsWith('dbo.')) {
        try {
          console.log(`First attempting with schema prefix: ${procedure}`);
          const result = await request.execute(procedure);
          console.log(`Procedure ${procedure} executed successfully with result sets:`, result.recordsets?.length);
          return result;
        } catch (schemaError: any) {
          console.error(`Error with schema prefix, trying without: ${schemaError.message}`);
          // Try without the schema prefix
          const procedureWithoutSchema = procedure.replace('dbo.', '');
          console.log(`Retrying with: ${procedureWithoutSchema}`);
          const result = await request.execute(procedureWithoutSchema);
          console.log(`Procedure ${procedureWithoutSchema} executed successfully with result sets:`, result.recordsets?.length);
          return result;
        }
      } else {
        // No schema prefix in the request
        console.log(`Executing without schema prefix: ${procedure}`);
        const result = await request.execute(procedure);
        console.log(`Procedure ${procedure} executed successfully with result sets:`, result.recordsets?.length);
        return result;
      }
    } catch (execError: any) {
      console.error(`Specific error executing procedure ${procedure}:`, {
        message: execError.message,
        code: execError.code,
        number: execError.number,
        lineNumber: execError.lineNumber,
        state: execError.state,
        procedureName: execError.procName
      });

      // Try direct query as last resort for simple procedures
      if (procedure === 'dbo.SaveProject' || procedure === 'SaveProject') {
        console.log('Attempting direct query fallback for SaveProject');
        try {
          const { ProjectId, UserId, Title, Description, ProjectType, CompletedAt, SyncStatus } = params;
          
          const directQuery = `
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
          `;
          
          await executeQuery(directQuery, {
            ProjectId,
            UserId,
            Title,
            Description,
            ProjectType,
            CompletedAt: CompletedAt || new Date(),
            SyncStatus: SyncStatus || 'synced'
          });
          
          console.log('Direct query fallback successful');
          
          // Return a mock result
          return {
            recordsets: [],
            recordset: [],
            output: {},
            rowsAffected: [1],
            returnValue: 0
          } as any;
        } catch (directError) {
          console.error('Direct query fallback also failed:', directError);
          throw directError;
        }
      }
      
      throw execError;
    }
  } catch (error: any) {
    console.error(`Error executing stored procedure ${procedure}:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
    });
    throw error;
  }
} 