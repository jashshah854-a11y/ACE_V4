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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ExecutivePulse />} />
            <Route path="/report/summary" element={<ExecutivePulse />} />
            <Route path="/upload" element={<Index />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <GlobalErrorOverlay />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
