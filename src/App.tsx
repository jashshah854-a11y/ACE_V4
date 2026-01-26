import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NarrativeProvider } from "@/components/narrative/NarrativeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlobalErrorOverlay } from "@/components/ui/GlobalErrorOverlay";
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import ExecutivePulse from "./pages/ExecutivePulse";
import Pipeline from "./pages/Pipeline";
import DemoPipelineStatus from "./pages/DemoPipelineStatus";
import NotFound from "./pages/NotFound";
import FoundersLetter from "./pages/FoundersLetter";
import LandingPage from "./pages/LandingPage";
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));

const queryClient = new QueryClient();

const ReportRedirect = () => {
  const { runId } = useParams<{ runId: string }>();
  if (!runId) return <Navigate to="/app" replace />;
  return <Navigate to={`/app?run=${runId}`} replace />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NarrativeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/app" element={<ExecutivePulse />} />
                <Route path="/report/summary" element={<ExecutivePulse />} />
                <Route path="/report/:runId" element={<ReportRedirect />} />
                <Route path="/upload" element={<Index />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/pipeline/:runId" element={<Pipeline />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/diagnostics/:runId" element={<DiagnosticsPage />} />
                <Route path="/about" element={<FoundersLetter />} />
                <Route path="/logs/:runId" element={<Pipeline />} /> {/* Fallback to Pipeline view for logs */}
                <Route path="/demo/pipeline-status" element={<DemoPipelineStatus />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NarrativeProvider>
        <GlobalErrorOverlay />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
