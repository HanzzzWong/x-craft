'use client';

import {useState, useCallback, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {analyzeImageForRecyclables} from '@/ai/flows/analyze-image-recyclables';
import {suggestDIYProjects} from '@/ai/flows/suggest-diy-projects';
import {getYouTubeVideos, YouTubeVideo} from '@/services/youtube';
import {Icons} from '@/components/icons';
import {useToast} from "@/hooks/use-toast"
import {useDropzone} from 'react-dropzone'

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
    <div className="container mx-auto p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Image Analysis</CardTitle>
          <CardDescription>Identify recyclable items from uploaded images.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div {...getRootProps()} className="dropzone w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer">
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p>Drop the images here ...</p> :
                <>
                  <p>Drag 'n' drop some images here, or click to select images</p>
                  {images.length > 0 && (
                    <p>{images.length} images selected</p>
                  )}
                </>
            }
          </div>
          <Button onClick={handleImageAnalysis} className="bg-primary text-primary-foreground hover:bg-primary/80" disabled={images.length === 0}>
            Analyze Images
          </Button>
          {recyclableItems.length > 0 && (
            <div className="mt-2">
              <p>Identified Recyclable Items:</p>
              <ul>
                {recyclableItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Suggestions</CardTitle>
          <CardDescription>Get DIY project ideas based on identified recyclable items.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleProjectSuggestion} className="bg-primary text-primary-foreground hover:bg-primary/80" disabled={recyclableItems.length === 0}>
            Suggest Projects
          </Button>
          {projects.length > 0 && (
            <div className="mt-2">
              <p>Suggested Projects:</p>
              <ul>
                {projects.map((project, index) => (
                  <li key={index} className="cursor-pointer hover:underline" onClick={() => handleProjectClick(project)}>
                    {project.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProject.title}</CardTitle>
            <CardDescription>{selectedProject.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Required Items:</p>
            <ul className="list-disc list-inside">
              {selectedProject.requiredItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="mt-4">Step {currentStep + 1}:</h3>
            <Textarea readOnly value={selectedProject.steps[currentStep]} className="mb-2" />

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/80"
              >
                Previous Step
              </Button>
              <Button
                onClick={() => handleHelpClick(selectedProject.steps[currentStep])}
                className="bg-accent text-primary-foreground hover:bg-accent/80"
              >
                Help?
              </Button>
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === selectedProject.steps.length - 1}
                className="bg-primary text-primary-foreground hover:bg-primary/80"
              >
                Next Step
              </Button>
            </div>

            {helpVideos.length > 0 && (
              <div className="mt-4">
                <h4>Help Videos:</h4>
                <ul>
                  {helpVideos.map((video, index) => (
                    <li key={index}>
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
    </div>
  );
}
