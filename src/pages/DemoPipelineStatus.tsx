import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PipelineStatus, PipelineStep } from "@/components/report/PipelineStatus";
import { Play, RotateCcw, AlertTriangle, ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

const DEMO_STEPS: PipelineStep[] = [
  { id: "data_ingest", label: "Data Ingestion", description: "Loading and parsing uploaded file", status: "pending" },
  { id: "schema_analysis", label: "Schema Analysis", description: "Understanding column types and structure", status: "pending" },
  { id: "validation", label: "Data Validation", description: "Checking for quality issues and anomalies", status: "pending" },
  { id: "clustering", label: "Clustering", description: "Grouping similar data patterns", status: "pending" },
  { id: "model_training", label: "Model Training", description: "Building predictive models", status: "pending" },
  { id: "anomaly_detection", label: "Anomaly Detection", description: "Identifying outliers and unusual patterns", status: "pending" },
  { id: "persona_gen", label: "Persona Generation", description: "Creating customer segments", status: "pending" },
  { id: "report_gen", label: "Report Generation", description: "Compiling final analysis report", status: "pending" },
];

export default function DemoPipelineStatus() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const getStepsWithStatus = useCallback((): PipelineStep[] => {
    return DEMO_STEPS.map((step, index) => {
      if (hasError && index === currentStepIndex) {
        return { ...step, status: "error" as const };
      }
      if (index < currentStepIndex) {
        return { ...step, status: "completed" as const };
      }
      if (index === currentStepIndex) {
        return { ...step, status: "active" as const };
      }
      return { ...step, status: "pending" as const };
    });
  }, [currentStepIndex, hasError]);

  const handleNextStep = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setProgress(Math.round(((currentStepIndex + 2) / DEMO_STEPS.length) * 100));
      setHasError(false);
      setErrorMessage(undefined);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setProgress(Math.round((currentStepIndex / DEMO_STEPS.length) * 100));
      setHasError(false);
      setErrorMessage(undefined);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setProgress(0);
    setHasError(false);
    setErrorMessage(undefined);
    setIsAutoPlaying(false);
  };

  const handleSimulateError = () => {
    setHasError(true);
    setErrorMessage("Simulated error: Connection timeout while processing data chunk 47/128");
    setIsAutoPlaying(false);
  };

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    const newStepIndex = Math.min(
      Math.floor((newProgress / 100) * DEMO_STEPS.length),
      DEMO_STEPS.length - 1
    );
    setCurrentStepIndex(newStepIndex);
    setHasError(false);
    setErrorMessage(undefined);
  };

  const handleCompleteAll = () => {
    setCurrentStepIndex(DEMO_STEPS.length);
    setProgress(100);
    setHasError(false);
    setErrorMessage(undefined);
  };

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= DEMO_STEPS.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        const next = prev + 1;
        setProgress(Math.round(((next + 1) / DEMO_STEPS.length) * 100));
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-5 w-5" />
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Pipeline Status Demo</h1>
            </div>
            <span className="text-sm text-muted-foreground">Testing & Development</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Controls Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Demo Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step Navigation */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
              >
                Previous Step
              </Button>
              <Button 
                onClick={handleNextStep}
                disabled={currentStepIndex >= DEMO_STEPS.length - 1 || hasError}
              >
                <Play className="h-4 w-4 mr-2" />
                Next Step
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSimulateError}
                disabled={hasError}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Simulate Error
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleCompleteAll}
              >
                Complete All
              </Button>
            </div>

            {/* Progress Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Progress: {progress}%</Label>
                <span className="text-sm text-muted-foreground">
                  Step {currentStepIndex + 1} of {DEMO_STEPS.length}
                </span>
              </div>
              <Slider
                value={[progress]}
                onValueChange={handleProgressChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Auto-play Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="auto-play"
                checked={isAutoPlaying}
                onCheckedChange={setIsAutoPlaying}
              />
              <Label htmlFor="auto-play">Auto-advance steps (2s interval)</Label>
            </div>

            {/* Current State Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{currentStepIndex + 1}</div>
                <div className="text-xs text-muted-foreground">Current Step</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{progress}%</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className={`text-2xl font-bold ${hasError ? 'text-destructive' : 'text-green-500'}`}>
                  {hasError ? 'Error' : 'OK'}
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {getStepsWithStatus().filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Status Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PipelineStatus
            steps={getStepsWithStatus()}
            progress={progress}
            runId="demo-run-123abc"
            estimatedTimeRemaining={hasError ? undefined : "~3 min remaining"}
            error={errorMessage}
            onRetry={hasError ? () => {
              setHasError(false);
              setErrorMessage(undefined);
            } : undefined}
          />
        </motion.div>

        {/* Legend */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Step States Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Completed</div>
                  <div className="text-xs text-muted-foreground">Step finished successfully</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">Active</div>
                  <div className="text-xs text-muted-foreground">Currently processing</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-muted-foreground/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </div>
                <div>
                  <div className="font-medium text-sm">Pending</div>
                  <div className="text-xs text-muted-foreground">Waiting to start</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                </div>
                <div>
                  <div className="font-medium text-sm">Error</div>
                  <div className="text-xs text-muted-foreground">Step failed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
