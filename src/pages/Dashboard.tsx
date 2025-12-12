import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Play,
  History,
  AlertCircle,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerRun, listRunSummaries } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch recent runs
  const { data: recentRuns, isLoading: runsLoading } = useQuery({
    queryKey: ["runs", "recent"],
    queryFn: () => listRunSummaries(5),
    refetchInterval: 5000, // Poll every 5s for updates
  });

  // Mutation to start a run
  const runMutation = useMutation({
    mutationFn: triggerRun,
    onSuccess: (data) => {
      toast.success("Analysis started successfully!");
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      // Navigate to the new run immediately
      navigate(`/runs/${data.run_id}`);
    },
    onError: (error) => {
      toast.error(`Failed to start run: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file.");
      return;
    }

    runMutation.mutate(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">ACE Orchestrator</h1>
              <p className="text-muted-foreground mt-1">
                Autonomous Customer Intelligence Engine
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              <Button
                variant="hero"
                size="lg"
                onClick={handleUploadClick}
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                Start New Analysis
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {/* Quick Actions Card */}
            <Card className="col-span-full lg:col-span-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Initialize Pipeline
                </CardTitle>
                <CardDescription>
                  Upload a customer data CSV file to begin the autonomous analysis pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-primary/20 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={handleUploadClick}
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Drop your CSV here</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-4">
                    Supports customer transaction logs, demographic data, and behavior events.
                  </p>
                  <Button variant="outline" disabled={runMutation.isPending}>
                    Select File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status / Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Backend API</span>
                  <span className="flex items-center text-sm text-green-500 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">API Connection</span>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {import.meta.env.VITE_ACE_API_BASE_URL || "http://localhost:8001"}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Ensure your Python server is running on port 8001 (or as configured above) before starting an analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Runs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Runs
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/runs")}>
                View All
              </Button>
            </div>

            {runsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentRuns?.length === 0 ? (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground mb-2">No analysis runs found.</p>
                  <Button variant="link" onClick={handleUploadClick}>Start your first run</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recentRuns?.map((run) => (
                  <Card key={run.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/runs/${run.id}`)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <RunStatusBadge status={run.status} />
                        <div>
                          <p className="font-mono text-sm font-semibold">{run.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.createdAt ? formatDistanceToNow(new Date(run.createdAt), { addSuffix: true }) : "Unknown time"}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-8 text-sm text-muted-foreground">
                        {run.durationSeconds && (
                          <span>{run.durationSeconds}s duration</span>
                        )}
                        {run.completedSteps !== undefined && (
                          <span>{run.completedSteps} steps completed</span>
                        )}
                      </div>

                      <Button variant="ghost" size="icon">
                        <Play className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
