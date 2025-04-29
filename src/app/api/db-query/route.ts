import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Secure the endpoint by only allowing specific queries
const ALLOWED_QUERIES = [
  'SELECT TOP 10 * FROM Users',
  'SELECT TOP 10 * FROM Projects',
  'SELECT TOP 10 * FROM ProjectItems',
  'SELECT TOP 10 * FROM ProjectSteps',
  'SELECT COUNT(*) FROM Users',
  'SELECT COUNT(*) FROM Projects',
  'SELECT COUNT(*) FROM ProjectItems',
  'SELECT COUNT(*) FROM ProjectSteps',
];

export async function GET(request: Request) {
  try {
    // Extract query from URL
    const url = new URL(request.url);
    const queryParam = url.searchParams.get('query') || '';

    // Validate query for security
    if (!ALLOWED_QUERIES.includes(queryParam)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or unauthorized query',
        allowedQueries: ALLOWED_QUERIES
      }, { status: 403 });
    }
    
    // Execute the query
    console.log('Executing database query:', queryParam);
    const result = await executeQuery(queryParam);
    
    return NextResponse.json({
      success: true,
      query: queryParam,
      result
    });
    
  } catch (error) {
    console.error('Error executing database query:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error executing database query',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 