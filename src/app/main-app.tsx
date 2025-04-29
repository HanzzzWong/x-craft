'use client';

import {useState, useCallback, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {analyzeImageForRecyclables} from '@/ai/flows/analyze-image-recyclables';
import {suggestDIYProjects} from '@/ai/flows/suggest-diy-projects';
import {YouTubeVideo, getYouTubeVideos} from '@/services/youtube';
import {Icons} from '@/components/icons';
import {useToast} from "@/hooks/use-toast"
import {Toaster} from "@/components/ui/toaster"
import {useDropzone} from 'react-dropzone'
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Progress} from "@/components/ui/progress";
import { useAuth } from '@/contexts/auth-context';
import { saveCompletedProject } from '@/lib/projects-client';
import { useRouter } from 'next/navigation';
import {
  Upload, 
  Search, 
  CheckCircle, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  WifiOff, 
  Lightbulb,
  Image as ImageIcon,
  ExternalLink,
  Video
} from 'lucide-react';

// Create a custom icons object that uses both our component icons and Lucide icons
const CustomIcons = {
  ...Icons,
  upload: Upload,
  search: Search,
  check: CheckCircle,
  helpCircle: HelpCircle,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  loader: Loader2,
  sparkles: Sparkles,
  wifiOff: WifiOff,
  lightbulb: Lightbulb,
  image: ImageIcon,
  externalLink: ExternalLink,
  video: Video
};

interface Project {
  title: string;
  description: string;
  requiredItems: string[];
  steps: string[];
  videos?: YouTubeVideo[];
}

type ProjectType = 'handcraft' | 'iot' | null;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export default function MainApp() {
  const [projectType, setProjectType] = useState<ProjectType>(null);
  const [images, setImages] = useState<File[]>([]);
  const [recyclableItems, setRecyclableItems] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [helpVideos, setHelpVideos] = useState<YouTubeVideo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [suggestionProgress, setSuggestionProgress] = useState(0);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [stepVideosCache, setStepVideosCache] = useState<Record<number, YouTubeVideo[]>>({});
  const [isOffline, setIsOffline] = useState(false);
  const { toast } = useToast()
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "You're back online",
        description: "Internet connection restored. All features are available.",
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        variant: "destructive",
        title: "You're offline",
        description: "Some features like saving projects and loading videos may not work.",
      });
    };

    // Check initial status
    setIsOffline(!navigator.onLine);
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(acceptedFiles);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept: {'image/*': ['.jpeg', '.png', '.jpg']}})

  // Function to handle project type change and clear history
  const handleProjectTypeChange = (type: ProjectType) => {
    setProjectType(type);
    // Clear project history
    setImages([]);
    setRecyclableItems([]);
    setProjects([]);
    setSelectedProject(null);
    setCurrentStep(0);
    setHelpVideos([]);
  };

  const handleImageAnalysis = async () => {
    if (images.length === 0) {
      toast({
        variant: "destructive",
        title: "No images uploaded",
        description: "Please upload one or more images to analyze.",
      })
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      const analysisResults = await Promise.all(
        images.map(async image => {
          const photoBase64 = await fileToBase64(image);
          return analyzeImageForRecyclables({ photoBase64 });
        })
      );

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (analysisResults) {
        const items = analysisResults.flatMap(result => result.items.map(item => item.name));
        setRecyclableItems([...new Set(items)]); // remove duplicates
        toast({
          title: "Image analysis complete",
          description: "Recyclable items identified successfully.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Image analysis failed",
          description: "Could not identify recyclable items.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Image analysis failed",
        description: "An error occurred during analysis.",
      })
      console.error("Analysis error:", error);
    } finally {
      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 1000);
    }
  };

  const handleProjectSuggestion = async () => {
    if (recyclableItems.length === 0) {
      toast({
         variant: "destructive",
        title: "No recyclable items",
        description: "No recyclable items identified. Please analyze an image first.",
      })
      return;
    }

    setIsSuggesting(true);
    setSuggestionProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSuggestionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);
      
      const queryType = projectType === 'iot' ? 'with IoT sensors' : '';
      const suggestionResult = await suggestDIYProjects({
        recyclableItems, 
        projectTypeQuery: queryType
      });
      
      clearInterval(progressInterval);
      setSuggestionProgress(100);
      
      if (suggestionResult) {
        setProjects(suggestionResult.projects);
         toast({
          title: "Project suggestions generated",
          description: "DIY project ideas based on the identified recyclable items.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Project suggestion failed",
          description: "Could not generate project suggestions.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Project suggestion failed",
        description: "An error occurred while generating suggestions.",
      })
      console.error("Suggestion error:", error);
    } finally {
      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setIsSuggesting(false);
        setSuggestionProgress(0);
      }, 1000);
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setCurrentStep(0);
  };

  const handleHelpClick = async (step: string, stepIndex: number) => {
    if (selectedProject) {
      // Check if we already have videos for this step
      if (stepVideosCache[stepIndex] && stepVideosCache[stepIndex].length > 0) {
        setHelpVideos(stepVideosCache[stepIndex]);
        return;
      }
      
      // Set loading state
      setIsLoadingVideos(true);
      setHelpVideos([]);
      
      try {
        // We're using the step text to find step-specific videos
        // Pass true as the second parameter to indicate this is a step search
        const videos = await getYouTubeVideos(step, true);
        
        // Cache the videos for this step
        setStepVideosCache(prev => ({
          ...prev,
          [stepIndex]: videos
        }));
        
        setHelpVideos(videos);
        
        if (videos.length === 0) {
          toast({
            variant: "default",
            title: "No help videos found",
            description: "Couldn't find specific videos for this step. Try a different search term.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error loading videos",
          description: "There was a problem fetching help videos. Please try again.",
        });
        console.error("Error loading help videos:", error);
      } finally {
        setIsLoadingVideos(false);
      }
    }
  };

  // When changing steps, load videos from cache or clear if going to a new step
  useEffect(() => {
    if (selectedProject) {
      if (stepVideosCache[currentStep]) {
        // If we have cached videos for this step, show them
        setHelpVideos(stepVideosCache[currentStep]);
      } else {
        // Clear videos when going to a step that doesn't have cached videos
        setHelpVideos([]);
      }
    }
  }, [currentStep, selectedProject, stepVideosCache]);
  
  // Clear help videos and cache when project changes
  useEffect(() => {
    if (selectedProject) {
      setHelpVideos([]); // Clear help videos when project changes
      setStepVideosCache({}); // Clear video cache
    }
  }, [selectedProject]);

  const handleDoneClick = async () => {
    if (!selectedProject || !user) {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your project.",
          variant: "destructive"
        });
      }
      
      // Navigate to home page even if not signed in
      try {
        router.push('/home');
      } catch (e) {
        console.error("Navigation error:", e);
        // Fallback to window.location if router.push fails
        window.location.href = '/home';
      }
      return;
    }
    
    // Set loading state and create a timeout to prevent indefinite loading
    setIsLoading(true);
    const saveTimeout = setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Save operation timed out",
        description: "The operation took too long. Please try again or continue without saving.",
        variant: "destructive"
      });
      
      // Navigate after showing the error
      setTimeout(() => {
        try {
          router.push('/home');
        } catch (e) {
          window.location.href = '/home';
        }
      }, 2000);
    }, 15000); // 15 second timeout
    
    try {
      // Prepare the project data for saving
      const completedAt = new Date().toISOString();
      console.log('Setting completed date to:', completedAt);
      
      const projectData = {
        id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
        uid: user.uid,
        title: selectedProject.title,
        description: selectedProject.description,
        projectType: projectType || 'handcraft',
        completedAt: completedAt,
        syncStatus: navigator.onLine ? 'synced' : 'pending',
        requiredItems: selectedProject.requiredItems,
        steps: selectedProject.steps
      };
      
      console.log('Attempting to save project with data:', {
        id: projectData.id,
        uid: projectData.uid,
        title: projectData.title,
        description: projectData.description.substring(0, 30) + '...',
        completedAt: projectData.completedAt,
        itemsCount: projectData.requiredItems.length,
        stepsCount: projectData.steps.length
      });
      
      // Save project using the client API
      const success = await saveCompletedProject(projectData);
      
      // Clear the timeout since the operation completed
      clearTimeout(saveTimeout);
      setIsLoading(false);
      
      // Handle save result
      if (success) {
        toast({
          title: "Project completed!",
          description: navigator.onLine 
            ? "Your project has been saved to your history." 
            : "Your project has been saved locally and will sync when you're back online.",
        });
        
        // Navigate after a short delay to allow toast to be seen
        setTimeout(() => {
          try {
            // Navigate to projects page instead of home
            router.push('/projects');
          } catch (e) {
            // Fallback to window.location if router.push fails
            window.location.href = '/projects';
          }
        }, 1500);
      } else {
        // Handle error case
        toast({
          title: "Warning: Project may not be saved",
          description: "There was an issue saving your project.",
          variant: "destructive"
        });
        
        // Still navigate to home page after a delay
        setTimeout(() => {
          try {
            router.push('/home');
          } catch (e) {
            // Fallback to window.location if router.push fails
            window.location.href = '/home';
          }
        }, 2000);
      }
    } catch (error: any) {
      // Clear the timeout since the operation completed (with an error)
      clearTimeout(saveTimeout);
      setIsLoading(false);
      console.error('Error saving project:', error);
      
      // Handle specific error types
      let errorMessage = "There was a problem saving your project.";
      
      if (!navigator.onLine) {
        errorMessage = "You appear to be offline. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error saving project",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Still navigate to home page after a delay, even if saving failed
      setTimeout(() => {
        toast({
          title: "Navigating without saving",
          description: "Your project will not be saved due to the error.",
        });
        try {
          router.push('/home');
        } catch (e) {
          // Fallback to window.location if router.push fails
          window.location.href = '/home';
        }
      }, 3000);
    }
  };

  if (projectType === null) {
    return (
      <div className="container mx-auto p-4 flex flex-col gap-8">
        {isOffline && (
          <Alert variant="destructive" className="mb-2 bg-red-100 animate-pulse">
            <CustomIcons.wifiOff className="h-4 w-4 mr-2" />
            <AlertTitle>You are offline</AlertTitle>
            <AlertDescription>
              Some features like saving projects and loading videos won't work until your connection is restored.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-green-800">
            Choose Your Project Type
          </h1>
          <p className="text-green-700 mt-2">Select the type of DIY project you want to create</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-primary/20 overflow-hidden"
            onClick={() => handleProjectTypeChange('handcraft')}
          >
            <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
              <CardTitle className="text-green-800">Handcraft Project</CardTitle>
              <CardDescription className="text-green-700">Creative DIY projects without electronic components</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-full aspect-square relative overflow-hidden rounded-md mb-4">
                <img 
                  src="/handcraft.png" 
                  alt="Handcraft Project" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-center text-green-700">
                Transform recyclable items into beautiful and useful objects without using IoT sensors or electronics
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-primary/20 overflow-hidden"
            onClick={() => handleProjectTypeChange('iot')}
          >
            <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
              <CardTitle className="text-green-800">IoT Project</CardTitle>
              <CardDescription className="text-green-700">Smart DIY projects with electronic components</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-full aspect-square relative overflow-hidden rounded-md mb-4">
                <img 
                  src="/iot.png" 
                  alt="IoT Project" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-center text-green-700">
                Create innovative smart devices by combining recyclable items with IoT sensors and electronic components
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col gap-8">
      {isOffline && (
        <Alert variant="destructive" className="mb-2 bg-red-100 animate-pulse">
          <CustomIcons.wifiOff className="h-4 w-4 mr-2" />
          <AlertTitle>You are offline</AlertTitle>
          <AlertDescription>
            Some features like saving projects and loading videos won't work until your connection is restored.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-green-800">
          Transform Recyclables into Amazing Creations
        </h1>
        <p className="text-green-700 mt-2">
          {projectType === 'iot' 
            ? "Upload images of recyclable items and get creative IoT project ideas" 
            : "Upload images of recyclable items and get creative DIY project ideas"}
        </p>
        <div className="mt-2">
          <Button 
            variant="outline" 
            onClick={() => handleProjectTypeChange(null)}
            className="text-green-700"
          >
            <CustomIcons.arrowLeft className="mr-2 h-4 w-4" /> Change Project Type
          </Button>
        </div>
      </div>

      <Card className="card overflow-hidden border-primary/20">
        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CustomIcons.image className="h-5 w-5 text-green-700" />
            Image Analysis
          </CardTitle>
          <CardDescription className="text-green-700">Identify recyclable items from uploaded images.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          <div 
            {...getRootProps()} 
            className="dropzone w-full p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary"
          >
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p className="text-primary font-medium">Drop the images here ...</p> :
                <>
                  <CustomIcons.upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Drag 'n' drop some images here, or click to select images</p>
                  {images.length > 0 && (
                    <p className="mt-2 font-medium">{images.length} images selected</p>
                  )}
                </>
            }
          </div>
          <div className="w-full">
            {isAnalyzing && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">Analyzing images...</span>
                  <span className="text-green-700">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2 bg-green-100" indicatorClassName="bg-green-600" />
              </div>
            )}
            <Button 
              onClick={handleImageAnalysis} 
              className="btn-3d w-full bg-green-700 text-white hover:bg-green-800" 
              disabled={images.length === 0 || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <CustomIcons.loader className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <CustomIcons.search className="mr-2 h-4 w-4" /> Analyze Images
                </>
              )}
            </Button>
          </div>
          {recyclableItems.length > 0 && (
            <div className="mt-4 animated-fade-in">
              <p className="font-semibold mb-3 text-green-800">Identified Recyclable Items:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {recyclableItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="rounded-md shadow-sm border border-green-300 p-3 bg-green-50 text-green-800 font-medium transition-all hover:shadow-md hover:scale-105"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card overflow-hidden border-primary/20">
        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CustomIcons.lightbulb className="h-5 w-5 text-green-700" />
            Project Suggestions
          </CardTitle>
          <CardDescription className="text-green-700">
            {projectType === 'iot' 
              ? "Get DIY IoT project ideas using recyclable items and sensors" 
              : "Get DIY project ideas based on identified recyclable items"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="w-full">
            {isSuggesting && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-700">Generating project ideas...</span>
                  <span className="text-green-700">{suggestionProgress}%</span>
                </div>
                <Progress value={suggestionProgress} className="h-2 bg-green-100" indicatorClassName="bg-green-600" />
              </div>
            )}
            <Button 
              onClick={handleProjectSuggestion} 
              className="btn-3d w-full bg-green-700 text-white hover:bg-green-800" 
              disabled={recyclableItems.length === 0 || isSuggesting}
            >
              {isSuggesting ? (
                <>
                  <CustomIcons.loader className="mr-2 h-4 w-4 animate-spin" /> Generating Ideas...
                </>
              ) : (
                <>
                  <CustomIcons.sparkles className="mr-2 h-4 w-4" /> Suggest Projects
                </>
              )}
            </Button>
          </div>
          {projects.length > 0 && (
            <div className="mt-2 animated-fade-in">
              <p className="font-semibold mb-3 text-green-800">Suggested Projects:</p>
              <ul className="space-y-2">
                {projects.map((project, index) => (
                  <li 
                    key={index} 
                    className="cursor-pointer p-3 rounded-md hover:bg-green-50 transition-all border border-transparent hover:border-green-300 flex items-center"
                    onClick={() => handleProjectClick(project)}
                  >
                    <CustomIcons.arrowRight className="mr-2 h-4 w-4 text-green-700" />
                    <span className="font-medium text-green-800">{project.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card className="card overflow-hidden border-primary/20">
          <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
            <CardTitle className="text-green-800">{selectedProject.title}</CardTitle>
            <CardDescription className="text-green-700">{selectedProject.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-6">
            <div className="glass p-4 rounded-md bg-green-50">
              <p className="font-semibold mb-2 text-green-800">Required Items:</p>
              <ul className="list-disc list-inside space-y-1">
                {selectedProject.requiredItems.map((item, index) => (
                  <li key={index} className="text-green-800 font-medium">{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-primary/20 rounded-md p-4 bg-gradient-to-r from-green-50 to-transparent">
              <h3 className="font-semibold mb-3 text-green-800">Step {currentStep + 1} of {selectedProject.steps.length}:</h3>
              <Textarea 
                readOnly 
                value={selectedProject.steps[currentStep]} 
                className="mb-4 min-h-[100px] bg-white/90 focus-visible:ring-primary text-green-800" 
              />

              <div className="flex justify-between mt-4">
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="btn-3d bg-green-700 text-white hover:bg-green-800 flex items-center"
                >
                  <CustomIcons.arrowLeft className="mr-2 h-4 w-4" /> Previous Step
                </Button>
                {currentStep === selectedProject.steps.length - 1 ? (
                  <Button
                    onClick={handleDoneClick}
                    disabled={isLoading}
                    className="btn-3d bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <CustomIcons.loader className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CustomIcons.check className="mr-2 h-4 w-4" /> Done
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleHelpClick(selectedProject.steps[currentStep], currentStep)}
                    disabled={isLoadingVideos}
                    className="btn-3d bg-green-600 text-white hover:bg-green-700 flex items-center"
                  >
                    {isLoadingVideos ? (
                      <>
                        <CustomIcons.loader className="mr-2 h-4 w-4 animate-spin" /> Loading Videos...
                      </>
                    ) : (
                      <>
                        <CustomIcons.helpCircle className="mr-2 h-4 w-4" /> Help?
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === selectedProject.steps.length - 1}
                  className="btn-3d bg-green-700 text-white hover:bg-green-800 flex items-center"
                >
                  Next Step <CustomIcons.arrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {helpVideos.length > 0 && (
              <div className="mt-6 animated-fade-in">
                <h4 className="font-semibold mb-4 text-green-800 text-lg flex items-center">
                  <CustomIcons.video className="mr-2 h-5 w-5 text-green-700" />
                  Step {currentStep + 1} DIY Help Videos:
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {helpVideos.map((video, index) => (
                    <div 
                      key={index} 
                      className="bg-white shadow-md rounded-md overflow-hidden border border-green-200 transition-all hover:shadow-lg"
                    >
                      <div className="aspect-video bg-gray-100 relative">
                        <iframe
                          src={video.embedUrl}
                          title={video.title}
                          className="w-full h-full absolute top-0 left-0"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          loading="lazy"
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h5 className="font-medium text-green-800 mb-1">{video.title}</h5>
                        <p className="text-sm text-green-600 mb-2">
                          By {video.channelTitle}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-green-600 hover:text-green-800 hover:underline text-sm inline-flex items-center"
                        >
                          Watch on YouTube <CustomIcons.externalLink className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-green-600">
                    These videos show DIY techniques specific to this step.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Toaster />
    </div>
  );
} 