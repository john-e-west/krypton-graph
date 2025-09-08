import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  X,
  Lightbulb,
  Target,
  Upload,
  Eye,
  Zap,
  Award,
  HelpCircle,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    type: 'click' | 'upload' | 'input' | 'wait';
    element?: string;
    text?: string;
    data?: any;
  };
  validation?: () => boolean | Promise<boolean>;
  skippable?: boolean;
  autoAdvance?: boolean;
  duration?: number;
}

export interface TutorialSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  steps: TutorialStep[];
  badge?: string;
  estimatedTime?: string;
}

export interface OnboardingTutorialProps {
  sections: TutorialSection[];
  sampleData?: {
    documents: Array<{ name: string; content: string; type: string }>;
    ontologies: Array<{ name: string; types: string[] }>;
  };
  onComplete: (results: { completedSections: string[]; achievements: string[] }) => void;
  onSkip: () => void;
  onStepComplete?: (sectionId: string, stepId: string, data?: any) => void;
  autoStart?: boolean;
  allowSkip?: boolean;
  showProgress?: boolean;
  className?: string;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  sections,
  sampleData,
  onComplete,
  onSkip,
  onStepComplete,
  autoStart = false,
  allowSkip = true,
  showProgress = true,
  className = ''
}) => {
  const [isActive, setIsActive] = useState(autoStart);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [achievements, setAchievements] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentSectionData = sections[currentSection];
  const currentStepData = currentSectionData?.steps[currentStep];
  const totalSteps = sections.reduce((sum, section) => sum + section.steps.length, 0);
  const completedStepsCount = completedSteps.size;
  const progressPercentage = (completedStepsCount / totalSteps) * 100;

  // Sample tutorial sections
  const defaultSections: TutorialSection[] = [
    {
      id: 'welcome',
      title: 'Welcome to Krypton Graph',
      description: 'Get started with knowledge graph creation',
      icon: Target,
      estimatedTime: '2 min',
      steps: [
        {
          id: 'intro',
          title: 'Welcome!',
          description: 'Learn how to create knowledge graphs from documents',
          content: (
            <div className="text-center space-y-4">
              <div className="text-6xl">🚀</div>
              <h2 className="text-2xl font-bold">Welcome to Krypton Graph!</h2>
              <p className="text-gray-600">
                Transform your documents into intelligent knowledge graphs with AI assistance.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-sm font-medium">Upload Documents</div>
                </div>
                <div className="text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-sm font-medium">Review Types</div>
                </div>
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-sm font-medium">Generate Graph</div>
                </div>
              </div>
            </div>
          ),
          skippable: false,
          duration: 5000
        }
      ]
    },
    {
      id: 'document-upload',
      title: 'Document Upload',
      description: 'Learn to upload and process documents',
      icon: Upload,
      estimatedTime: '3 min',
      steps: [
        {
          id: 'upload-demo',
          title: 'Upload Your First Document',
          description: 'Try uploading a sample document',
          content: (
            <div className="space-y-4">
              <p>Let's start by uploading a document. You can drag and drop or click to browse.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Try the sample document below!</p>
              </div>
            </div>
          ),
          targetElement: '#document-uploader',
          action: {
            type: 'upload',
            data: sampleData?.documents[0]
          }
        },
        {
          id: 'processing-status',
          title: 'Document Processing',
          description: 'Watch the document being processed',
          content: (
            <div className="space-y-4">
              <p>Great! Now watch as we analyze your document and extract meaningful information.</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Document uploaded</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Text extracted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Circle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Analyzing content...</span>
                </div>
              </div>
            </div>
          ),
          autoAdvance: true,
          duration: 3000
        }
      ]
    },
    {
      id: 'type-review',
      title: 'Type Review',
      description: 'Review and refine extracted types',
      icon: Eye,
      estimatedTime: '4 min',
      steps: [
        {
          id: 'type-suggestions',
          title: 'Review AI Suggestions',
          description: 'Check the types AI extracted from your document',
          content: (
            <div className="space-y-4">
              <p>The AI has analyzed your document and suggested these entity types:</p>
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-800">Person</Badge>
                <Badge className="bg-green-100 text-green-800">Organization</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">Location</Badge>
                <Badge className="bg-purple-100 text-purple-800">Event</Badge>
              </div>
              <p className="text-sm text-gray-600">
                You can accept, modify, or reject these suggestions.
              </p>
            </div>
          ),
          targetElement: '#type-suggestions'
        },
        {
          id: 'confidence-scores',
          title: 'Understanding Confidence Scores',
          description: 'Learn about AI confidence indicators',
          content: (
            <div className="space-y-4">
              <p>Each suggestion comes with a confidence score:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span>Person</span>
                  <Badge className="bg-green-100 text-green-800">95%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span>Organization</span>
                  <Badge className="bg-yellow-100 text-yellow-800">78%</Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Higher percentages indicate more confident AI suggestions.
              </p>
            </div>
          )
        }
      ]
    },
    {
      id: 'graph-creation',
      title: 'Graph Creation',
      description: 'Generate your knowledge graph',
      icon: Zap,
      estimatedTime: '3 min',
      steps: [
        {
          id: 'generate-graph',
          title: 'Generate Knowledge Graph',
          description: 'Create your first knowledge graph',
          content: (
            <div className="space-y-4">
              <p>Ready to create your knowledge graph? Click the generate button!</p>
              <Button className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Generate Knowledge Graph
              </Button>
              <p className="text-sm text-gray-600">
                This will create nodes and relationships based on your document.
              </p>
            </div>
          ),
          action: {
            type: 'click',
            element: '#generate-graph-btn'
          }
        },
        {
          id: 'explore-graph',
          title: 'Explore Your Graph',
          description: 'Navigate and interact with the generated graph',
          content: (
            <div className="space-y-4">
              <p>Congratulations! Your knowledge graph has been created.</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    P
                  </div>
                  <div className="text-sm">
                    <ArrowRight className="h-4 w-4 inline mr-1" />
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    O
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">Sample: Person → Works_At → Organization</p>
              </div>
            </div>
          ),
          targetElement: '#graph-viewer'
        }
      ]
    }
  ];

  const tutorialSections = sections.length > 0 ? sections : defaultSections;

  useEffect(() => {
    if (isPlaying && currentStepData?.autoAdvance) {
      intervalRef.current = setTimeout(() => {
        handleNextStep();
      }, currentStepData.duration || 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentSection, currentStep]);

  useEffect(() => {
    // Highlight target element
    if (currentStepData?.targetElement) {
      setHighlightedElement(currentStepData.targetElement);
    } else {
      setHighlightedElement(null);
    }

    return () => setHighlightedElement(null);
  }, [currentStepData]);

  const handleStart = () => {
    setIsActive(true);
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsActive(false);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
  };

  const handleNextStep = async () => {
    const stepId = `${currentSectionData.id}-${currentStepData.id}`;
    
    // Validate step completion if validation function exists
    if (currentStepData.validation) {
      const isValid = await currentStepData.validation();
      if (!isValid) return;
    }

    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    // Call step completion callback
    onStepComplete?.(currentSectionData.id, currentStepData.id, stepData[stepId]);

    // Check for achievements
    if (completedStepsCount + 1 === 1) {
      setAchievements(prev => new Set([...prev, 'first-step']));
    }
    if (completedStepsCount + 1 === Math.floor(totalSteps / 2)) {
      setAchievements(prev => new Set([...prev, 'halfway']));
    }

    // Advance to next step or section
    if (currentStep < currentSectionData.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentSection < tutorialSections.length - 1) {
      setCurrentSection(prev => prev + 1);
      setCurrentStep(0);
      setAchievements(prev => new Set([...prev, `section-${currentSectionData.id}`]));
    } else {
      // Tutorial complete
      handleComplete();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      setCurrentStep(tutorialSections[currentSection - 1].steps.length - 1);
    }
  };

  const handleSkipToSection = (sectionIndex: number) => {
    setCurrentSection(sectionIndex);
    setCurrentStep(0);
  };

  const handleComplete = () => {
    setIsPlaying(false);
    setAchievements(prev => new Set([...prev, 'completed']));
    onComplete({
      completedSections: tutorialSections.map(s => s.id),
      achievements: Array.from(achievements)
    });
    setIsActive(false);
  };

  const handleSkip = () => {
    onSkip();
    setIsActive(false);
  };

  if (!isActive) {
    return (
      <Card className={cn("border-2 border-blue-200 bg-blue-50", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Interactive Tutorial</h3>
                <p className="text-gray-600">Learn how to create knowledge graphs step by step</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {allowSkip && (
                <Button variant="outline" onClick={handleSkip}>
                  Skip Tutorial
                </Button>
              )}
              <Button onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" />
                Start Tutorial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isActive} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <currentSectionData.icon className="h-6 w-6 text-blue-600" />
              <div>
                <DialogTitle>{currentSectionData.title}</DialogTitle>
                <p className="text-sm text-gray-600">{currentSectionData.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {achievements.size > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Award className="h-3 w-3 mr-1" />
                  {achievements.size}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedStepsCount} / {totalSteps} steps</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Section Navigation */}
          <div className="w-64 border-r pr-4 overflow-y-auto">
            <div className="space-y-2">
              {tutorialSections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => handleSkipToSection(index)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    index === currentSection 
                      ? "bg-blue-100 text-blue-800 border-2 border-blue-200" 
                      : "hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{section.title}</div>
                      <div className="text-xs text-gray-600">{section.estimatedTime}</div>
                    </div>
                    {section.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex space-x-1">
                      {section.steps.map((step, stepIndex) => (
                        <div
                          key={step.id}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            completedSteps.has(`${section.id}-${step.id}`)
                              ? "bg-green-500"
                              : index === currentSection && stepIndex === currentStep
                                ? "bg-blue-500"
                                : "bg-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 pl-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline">
                    Step {currentStep + 1} of {currentSectionData.steps.length}
                  </Badge>
                  {currentStepData.skippable && (
                    <Badge variant="secondary">Optional</Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
                <p className="text-gray-600 mb-4">{currentStepData.description}</p>
              </div>

              <div className="bg-white border rounded-lg p-6">
                {currentStepData.content}
              </div>

              {currentStepData.action?.type === 'input' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Try it yourself</span>
                  </div>
                  <p className="text-sm text-blue-700">{currentStepData.action.text}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousStep}
              disabled={currentSection === 0 && currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentSection(0);
                setCurrentStep(0);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {currentStepData.skippable && (
              <Button variant="outline" onClick={handleNextStep}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            )}
            <Button onClick={handleNextStep}>
              {currentSection === tutorialSections.length - 1 && 
               currentStep === currentSectionData.steps.length - 1 
                ? 'Complete Tutorial' 
                : 'Next Step'
              }
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};