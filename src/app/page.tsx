'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {analyzeImageForRecyclables} from '@/ai/flows/analyze-image-recyclables';
import {suggestDIYProjects} from '@/ai/flows/suggest-diy-projects';
import {getYouTubeVideos, YouTubeVideo} from '@/services/youtube';
import {useEffect} from 'react';
import {Icons} from '@/components/icons';

interface Project {
  title: string;
  description: string;
  requiredItems: string[];
  steps: string[];
  videos?: YouTubeVideo[];
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState('');
  const [recyclableItems, setRecyclableItems] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [helpVideos, setHelpVideos] = useState<YouTubeVideo[]>([]);

  const handleImageAnalysis = async () => {
    if (!imageUrl) {
      alert('Please enter an image URL');
      return;
    }

    const analysisResult = await analyzeImageForRecyclables({photoUrl: imageUrl});
    if (analysisResult) {
      const items = analysisResult.items.map(item => item.name);
      setRecyclableItems(items);
    }
  };

  const handleProjectSuggestion = async () => {
    if (recyclableItems.length === 0) {
      alert('No recyclable items identified. Please analyze an image first.');
      return;
    }

    const suggestionResult = await suggestDIYProjects({recyclableItems});
    if (suggestionResult) {
      setProjects(suggestionResult.projects);
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
          <CardDescription>Identify recyclable items from an image URL.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            type="url"
            placeholder="Enter image URL"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
          />
          <Button onClick={handleImageAnalysis} className="bg-primary text-primary-foreground hover:bg-primary/80">
            Analyze Image
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
            <ul>
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
