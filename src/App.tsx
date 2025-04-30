
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Qualification from "./pages/Qualification";
import Profiling from "./pages/Profiling";
import JobHistory from "./pages/JobHistory";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/qualification" element={
            <AppLayout>
              <Qualification />
            </AppLayout>
          } />
          <Route path="/profiling" element={
            <AppLayout>
              <Profiling />
            </AppLayout>
          } />
          <Route path="/history" element={
            <AppLayout>
              <JobHistory />
            </AppLayout>
          } />
          <Route path="/settings" element={
            <AppLayout>
              <Settings />
            </AppLayout>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
