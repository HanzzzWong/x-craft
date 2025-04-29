import { NextResponse } from 'next/server';
import { executeStoredProcedure } from '@/lib/database';

// List of allowed stored procedures that can be executed for testing
const ALLOWED_PROCEDURES = [
  'dbo.GetUserProjects',
  'dbo.GetProjectWithDetails',
  'dbo.SaveProject'
];

export async function POST(request: Request) {
  try {
    const { procedureName, parameters } = await request.json();
    
    console.log(`Request to execute stored procedure: ${procedureName}`);
    console.log('With parameters:', parameters);
    
    // Security check - only allow specified procedures
    if (!ALLOWED_PROCEDURES.includes(procedureName)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized procedure execution',
        allowedProcedures: ALLOWED_PROCEDURES
      }, { status: 403 });
    }
    
    // Execute the procedure with provided parameters
    const result = await executeStoredProcedure(procedureName, parameters);
    
    // Format recordsets for response
    const formattedResult = {
      rowsAffected: result.rowsAffected,
      returnValue: result.returnValue,
      output: result.output,
      recordsets: result.recordsets?.map(recordset => {
        if (recordset.length > 10) {
          return {
            length: recordset.length,
            sample: recordset.slice(0, 10),
            message: 'Results truncated for display'
          };
        }
        return recordset;
      })
    };
    
    return NextResponse.json({
      success: true,
      procedureName,
      result: formattedResult
    });
    
  } catch (error) {
    console.error('Error executing stored procedure:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json({
      success: false,
      error: 'Error executing stored procedure',
      details: errorMessage,
      stack: errorStack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
} 