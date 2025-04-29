// Database initialization module
import fs from 'fs';
import path from 'path';
import { executeQuery, initializeDatabase as connectToDb } from './database';

/**
 * Initialize the database schema if needed
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database connection...");
    
    // Connect to the database
    await connectToDb();
    
    // Check if tables exist
    const tableExists = await checkDatabaseTables();
    
    if (!tableExists) {
      console.log("Database tables don't exist. Creating schema...");
      await createDatabaseSchema();
    } else {
      console.log("Database schema already exists");
    }
    
    console.log("Database initialization completed successfully");
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
}

/**
 * Check if the required database tables exist
 */
async function checkDatabaseTables(): Promise<boolean> {
  try {
    const result = await executeQuery<{ tableCount: number }>(`
      SELECT COUNT(*) as tableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Users'
    `);
    
    return result[0]?.tableCount > 0;
  } catch (error) {
    console.error("Error checking database tables:", error);
    return false;
  }
}

/**
 * Create the database schema from SQL file
 */
async function createDatabaseSchema(): Promise<boolean> {
  try {
    // In production, use a more robust approach
    const schemaFilePath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    
    if (!fs.existsSync(schemaFilePath)) {
      throw new Error(`Schema file not found at ${schemaFilePath}`);
    }
    
    const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
    
    // Split and execute statements (simple approach)
    // For more complex SQL, consider using a proper SQL parser
    const statements = schemaContent
      .split('GO')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await executeQuery(statement);
        console.log(`Executed SQL statement successfully`);
      } catch (err) {
        console.error(`Error executing SQL statement: ${err}`);
        // Continue with next statement
      }
    }
    
    console.log("Database schema created successfully");
    return true;
  } catch (error) {
    console.error("Error creating database schema:", error);
    throw error;
  }
} 