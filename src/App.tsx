
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
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes - no layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              
              {/* Protected routes with layout */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Index />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/qualification" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Qualification />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profiling" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profiling />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/job-history" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JobHistory />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/job/:id" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JobDetails />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Analytics />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Admin />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
