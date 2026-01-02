import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlobalErrorOverlay } from "@/components/ui/GlobalErrorOverlay";
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import ExecutivePulse from "./pages/ExecutivePulse";
import Pipeline from "./pages/Pipeline";
import DemoPipelineStatus from "./pages/DemoPipelineStatus";
import NotFound from "./pages/NotFound";
import ReportPage from "./pages/ReportPage";
import LandingPage from "./pages/LandingPage";
import { SimulationSafeModeBanner } from "@/components/trust/SafeModeBanner";

import { SimulationProvider } from "./context/SimulationContext";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SimulationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SimulationSafeModeBanner />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app" element={<ExecutivePulse />} />
              <Route path="/report/summary" element={<ExecutivePulse />} />
              {/* ADDED: Route for the new wide report viewer */}
              <Route path="/report/:runId" element={<ReportPage />} />
              <Route path="/upload" element={<Index />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/pipeline/:runId" element={<Pipeline />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/demo/pipeline-status" element={<DemoPipelineStatus />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <GlobalErrorOverlay />
        </TooltipProvider>
      </SimulationProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
