import { Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import SimpleUpload from "./pages/SimpleUpload";
import SimpleReport from "./pages/SimpleReport";
import SimpleReportList from "./pages/SimpleReportList";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          <Routes>
            <Route path="/" element={<SimpleUpload />} />
            <Route path="/upload" element={<SimpleUpload />} />
            <Route path="/report/:runId" element={<SimpleReport />} />
            <Route path="/reports" element={<SimpleReportList />} />
            <Route path="/app" element={<Navigate to="/reports" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

