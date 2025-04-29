import { NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    // Create the uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
      console.log(`Created uploads directory at ${uploadsDir}`);
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Directories created or verified successfully",
      directories: {
        uploads: uploadsDir
      }
    });
  } catch (error: any) {
    console.error('Error creating directories:', error);
    
    return NextResponse.json(
      { 
        error: `Failed to create directories: ${error.message}`,
        details: error
      },
      { status: 500 }
    );
  }
} 