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

interface Project {
  title: string;
  description: string;
  requiredItems: string[];
  steps: string[];
  videos?: YouTubeVideo[];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [recyclableItems, setRecyclableItems] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [helpVideos, setHelpVideos] = useState<YouTubeVideo[]>([]);
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(acceptedFiles);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept: {'image/*': ['.jpeg', '.png', '.jpg']}})

  const handleImageAnalysis = async () => {
    if (images.length === 0) {
      toast({
        variant: "destructive",
        title: "No images uploaded",
        description: "Please upload one or more images to analyze.",
      })
      return;
    }

    const analysisResults = await Promise.all(
      images.map(async image => {
        const photoBase64 = await fileToBase64(image);
        return analyzeImageForRecyclables({ photoBase64 });
      })
    );

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

    const suggestionResult = await suggestDIYProjects({recyclableItems});
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
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setCurrentStep(0);
  };

  const handleHelpClick = async (step: string) => {
    if (selectedProject) {
      const videos = await getYouTubeVideos(`${selectedProject.title} ${step}`);
      setHelpVideos(videos);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      setHelpVideos([]); // Clear help videos when project changes
    }
  }, [selectedProject]);

  return (
    <div className="container mx-auto p-4 flex flex-col gap-8">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Transform Recyclables into Amazing Creations
        </h1>
        <p className="text-muted-foreground mt-2">Upload images of recyclable items and get creative DIY project ideas</p>
      </div>

      <Card className="card overflow-hidden border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="flex items-center gap-2">
            <Icons.image className="h-5 w-5" />
            Image Analysis
          </CardTitle>
          <CardDescription>Identify recyclable items from uploaded images.</CardDescription>
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
                  <Icons.upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Drag 'n' drop some images here, or click to select images</p>
                  {images.length > 0 && (
                    <p className="mt-2 font-medium">{images.length} images selected</p>
                  )}
                </>
            }
          </div>
          <Button 
            onClick={handleImageAnalysis} 
            className="btn-3d w-full bg-primary text-primary-foreground hover:bg-primary/90" 
            disabled={images.length === 0}
          >
            <Icons.search className="mr-2 h-4 w-4" /> Analyze Images
          </Button>
          {recyclableItems.length > 0 && (
            <div className="mt-4 animated-fade-in">
              <p className="font-semibold mb-3">Identified Recyclable Items:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {recyclableItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="rounded-md shadow-sm border border-primary/20 p-3 bg-primary/5 transition-all hover:shadow-md hover:scale-105"
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
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="flex items-center gap-2">
            <Icons.lightbulb className="h-5 w-5" />
            Project Suggestions
          </CardTitle>
          <CardDescription>Get DIY project ideas based on identified recyclable items.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6">
          <Button 
            onClick={handleProjectSuggestion} 
            className="btn-3d w-full bg-primary text-primary-foreground hover:bg-primary/90" 
            disabled={recyclableItems.length === 0}
          >
            <Icons.sparkles className="mr-2 h-4 w-4" /> Suggest Projects
          </Button>
          {projects.length > 0 && (
            <div className="mt-2 animated-fade-in">
              <p className="font-semibold mb-3">Suggested Projects:</p>
              <ul className="space-y-2">
                {projects.map((project, index) => (
                  <li 
                    key={index} 
                    className="cursor-pointer p-3 rounded-md hover:bg-primary/5 transition-all border border-transparent hover:border-primary/20 flex items-center"
                    onClick={() => handleProjectClick(project)}
                  >
                    <Icons.chevronRight className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">{project.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card className="card overflow-hidden border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle>{selectedProject.title}</CardTitle>
            <CardDescription>{selectedProject.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-6">
            <div className="glass p-4 rounded-md">
              <p className="font-semibold mb-2">Required Items:</p>
              <ul className="list-disc list-inside space-y-1">
                {selectedProject.requiredItems.map((item, index) => (
                  <li key={index} className="text-primary-foreground/80">{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-primary/20 rounded-md p-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h3 className="font-semibold mb-3">Step {currentStep + 1} of {selectedProject.steps.length}:</h3>
              <Textarea 
                readOnly 
                value={selectedProject.steps[currentStep]} 
                className="mb-4 min-h-[100px] bg-white/50 focus-visible:ring-primary" 
              />

              <div className="flex justify-between mt-4">
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="btn-3d bg-primary/80 text-primary-foreground hover:bg-primary/90 flex items-center"
                >
                  <Icons.arrowLeft className="mr-2 h-4 w-4" /> Previous Step
                </Button>
                <Button
                  onClick={() => handleHelpClick(selectedProject.steps[currentStep])}
                  className="btn-3d bg-accent text-accent-foreground hover:bg-accent/90 flex items-center"
                >
                  <Icons.helpCircle className="mr-2 h-4 w-4" /> Help?
                </Button>
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === selectedProject.steps.length - 1}
                  className="btn-3d bg-primary/80 text-primary-foreground hover:bg-primary/90 flex items-center"
                >
                  Next Step <Icons.arrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {helpVideos.length > 0 && (
              <div className="mt-4 animated-fade-in">
                <h4 className="font-semibold mb-2">Help Videos:</h4>
                <ul className="space-y-2">
                  {helpVideos.map((video, index) => (
                    <li key={index} className="p-2 hover:bg-primary/5 rounded-md transition-all">
                      <a 
                        href={video.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline flex items-center"
                      >
                        <Icons.video className="mr-2 h-4 w-4" />
                        {video.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Toaster />
    </div>
  );
}

