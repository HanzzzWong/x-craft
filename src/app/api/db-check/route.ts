import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Simple query to check if the database is connected
    const result = await executeQuery('SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES', {});
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      dbStatus: 'connected',
      tables: result.length
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      dbStatus: 'disconnected',
      error: error.message
    }, { status: 500 });
  }
} 