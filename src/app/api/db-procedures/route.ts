import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  is_identity: boolean;
}

interface TableColumns {
  [tableName: string]: ColumnInfo[];
}

export async function GET(request: Request) {
  try {
    // Get all stored procedures
    const procedures = await executeQuery<{procedure_name: string}>(`
      SELECT ROUTINE_NAME as procedure_name
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE' AND SPECIFIC_SCHEMA = 'dbo'
      ORDER BY ROUTINE_NAME
    `);
    
    // Get parameters for each stored procedure
    const procedureData = [];
    
    for (const proc of procedures) {
      const parameters = await executeQuery(`
        SELECT 
          p.name as parameter_name,
          t.name as data_type,
          p.max_length,
          p.is_output,
          p.is_nullable,
          p.parameter_id,
          p.has_default_value,
          p.default_value
        FROM 
          sys.parameters p
          INNER JOIN sys.procedures sp ON p.object_id = sp.object_id
          INNER JOIN sys.types t ON p.system_type_id = t.system_type_id
        WHERE 
          sp.name = @procName
        ORDER BY 
          p.parameter_id
      `, { procName: proc.procedure_name });
      
      // Get procedure definition
      const definition = await executeQuery<{definition: string}>(`
        SELECT definition
        FROM sys.sql_modules
        WHERE object_id = OBJECT_ID(N'dbo.${proc.procedure_name}')
      `);
      
      procedureData.push({
        name: proc.procedure_name,
        parameters,
        definition: definition[0]?.definition
      });
    }
    
    // Also get schema information for related tables
    const tables = await executeQuery<{table_name: string}>(`
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = DB_NAME()
      AND (
        TABLE_NAME = 'Projects' OR
        TABLE_NAME = 'ProjectItems' OR
        TABLE_NAME = 'ProjectSteps' OR
        TABLE_NAME = 'Users'
      )
      ORDER BY TABLE_NAME
    `);
    
    const tableColumns: TableColumns = {};
    for (const table of tables) {
      const columns = await executeQuery<ColumnInfo>(`
        SELECT 
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable,
          COLUMNPROPERTY(OBJECT_ID('${table.table_name}'), COLUMN_NAME, 'IsIdentity') as is_identity
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table.table_name}'
        ORDER BY ORDINAL_POSITION
      `);
      
      tableColumns[table.table_name] = columns;
    }
    
    return NextResponse.json({
      success: true,
      procedures: procedureData,
      tables: tableColumns
    });
    
  } catch (error) {
    console.error('Error retrieving stored procedure information:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error retrieving stored procedure information',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 