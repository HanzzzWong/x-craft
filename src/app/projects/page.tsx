'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { getUserProjects, Project } from '@/lib/projects-client';
import { useToast } from '@/hooks/use-toast';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProjects() {
      if (user) {
        try {
          setIsLoading(true);
          console.log('Fetching projects for user:', user.uid);
          const projectsData = await getUserProjects(user.uid);
          console.log('Projects fetched:', projectsData);
          setProjects(projectsData);
          toast({
            title: 'Projects loaded',
            description: `${projectsData.length} projects found in your account.`,
          });
        } catch (error) {
          console.error('Error fetching projects:', error);
          toast({
            variant: "destructive",
            title: "Failed to load projects",
            description: "We couldn't load your projects. Please try again later.",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      fetchProjects();
    }
  }, [user, toast]);

  if (loading || (!user && !loading)) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="text-center">
          <Icons.loader className="mx-auto h-8 w-8 animate-spin text-green-600 mb-4" />
          <h2 className="text-xl font-medium text-green-800">Loading...</h2>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Date not available';
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">My Projects</h1>
        <Button 
          className="bg-green-700 hover:bg-green-800"
          onClick={() => router.push('/main')}
        >
          <Icons.plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Icons.loader className="mx-auto h-8 w-8 animate-spin text-green-600 mb-4" />
          <p className="text-lg text-green-700">Loading your projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="bg-green-50/50 border-dashed border-2 border-green-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Icons.sparkles className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-xl font-medium text-green-800 mb-2">No projects yet</h3>
              <p className="text-green-700 mb-6 max-w-md mx-auto">
                Start by creating your first DIY project with recyclable materials!
              </p>
              <Button 
                className="bg-green-700 hover:bg-green-800"
                onClick={() => router.push('/main')}
              >
                <Icons.plus className="mr-2 h-4 w-4" /> Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="border-green-200 hover:shadow-md transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
                <CardTitle className="text-green-800">{project.title}</CardTitle>
                <CardDescription>
                  {formatDate(project.completedAt || '')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600 line-clamp-3">{project.description}</p>
                {project.projectType && (
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      project.projectType === 'iot' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {project.projectType === 'iot' ? 'IoT Project' : 'Handcraft Project'}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full text-green-700 border-green-300 hover:bg-green-50"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 