
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardEditPage from "./pages/DashboardEditPage";
import DashboardViewPage from "./pages/DashboardViewPage";
import LoginPage from "./pages/LoginPage";
import AnalyticsHub from "./pages/AnalyticsHub";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard/:id/edit" 
                element={
                  <ProtectedRoute>
                    <DashboardEditPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/dashboard/:id/view" 
                element={
                  <ProtectedRoute>
                    <DashboardViewPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/analytics-hub" 
                element={
                  <ProtectedRoute>
                    <AnalyticsHub />
                  </ProtectedRoute>
                }
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/analytics-hub" replace />} />
              <Route path="*" element={<Navigate to="/analytics-hub" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
