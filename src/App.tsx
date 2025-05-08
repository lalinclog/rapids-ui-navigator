
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Qualification from "./pages/Qualification";
import Profiling from "./pages/Profiling";
import JobHistory from "./pages/JobHistory";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import JobDetails from "./pages/JobDetails";
import Analytics from "./pages/Analytics";
import DashboardView from "./pages/DashboardView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/qualification" element={
              <ProtectedRoute>
                <AppLayout>
                  <Qualification />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/profiling" element={
              <ProtectedRoute>
                <AppLayout>
                  <Profiling />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <AppLayout>
                  <JobHistory />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/jobs/:jobId" element={
              <ProtectedRoute>
                <AppLayout>
                  <JobDetails />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* Analytics Routes */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/bi/dashboards/:dashboardId" element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
