import { NextResponse } from 'next/server';
import { getUserProjects } from '@/lib/projects';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    console.log(`API: Fetching projects for user: ${userId}`);
    
    if (!userId) {
      console.error('API: Missing userId parameter');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const projects = await getUserProjects(userId);
    console.log(`API: Found ${projects.length} projects for user ${userId}`);
    
    // Convert dates to ISO strings for JSON serialization
    const formattedProjects = projects.map(project => ({
      ...project,
      completedAt: project.completedAt ? new Date(project.completedAt).toISOString() : null
    }));
    
    return NextResponse.json(formattedProjects);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error fetching user projects:', { error: errorMessage, userId: params.userId });
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
} 