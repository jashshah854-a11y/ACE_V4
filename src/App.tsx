import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";

const UploadPage = lazy(() => import("./pages/UploadPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const ReportDashboard = lazy(() => import("./pages/ReportDashboard"));
const ReportsListPage = lazy(() => import("./pages/ReportsListPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center space-y-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<UploadPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/pipeline/:runId" element={<PipelinePage />} />
              <Route path="/report/:runId" element={<ReportDashboard />} />
              <Route path="/reports" element={<ReportsListPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
