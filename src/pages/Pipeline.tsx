import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PipelineStatus } from "@/components/report/PipelineStatus";
import { Home, ChevronRight, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Pipeline() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const handleComplete = () => {
    // Navigate to report when analysis completes
    if (runId) {
      navigate(`/report/summary?run=${runId}`);
    }
  };

  // If no runId, show error state
  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-5 w-5" />
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Analysis Pipeline</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">No Analysis Found</h2>
                    <p className="text-muted-foreground mb-6">
                      It looks like you navigated here without starting an analysis. 
                      Please upload a file to begin.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Data
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold">Analysis Pipeline</h1>
            </div>
            <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
              {runId.slice(0, 12)}...
            </code>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <PipelineStatus runId={runId} onComplete={handleComplete} />
        </motion.div>

        {/* Back to upload link */}
        <div className="text-center mt-8">
          <Link 
            to="/upload" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Upload
          </Link>
        </div>
      </main>
    </div>
  );
}
