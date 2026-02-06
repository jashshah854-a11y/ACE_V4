import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import UploadPage from "@/pages/UploadPage";
import PipelinePage from "@/pages/PipelinePage";
import ReportPage from "@/pages/ReportPage";
import HistoryPage from "@/pages/HistoryPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "bg-card border-border text-foreground",
          }}
        />
        <AppLayout>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/pipeline/:runId" element={<PipelinePage />} />
            <Route path="/report/:runId" element={<ReportPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
