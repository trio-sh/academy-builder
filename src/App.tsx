import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Platform from "./pages/Platform";
import GetStarted from "./pages/GetStarted";
import Employers from "./pages/Employers";
import Schools from "./pages/Schools";
import Login from "./pages/Login";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import VerifyPassport from "./pages/VerifyPassport";

// Dashboard pages
import CandidateDashboard from "./pages/dashboard/CandidateDashboard";
import MentorDashboard from "./pages/dashboard/MentorDashboard";
import EmployerDashboard from "./pages/dashboard/EmployerDashboard";

import { Chatbot } from "./components/Chatbot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/employers" element={<Employers />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/about" element={<About />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/press" element={<Press />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />

            {/* Auth callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Skill Passport verification (public) */}
            <Route path="/verify/:code" element={<VerifyPassport />} />

            {/* Public only routes (redirect if logged in) */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/get-started"
              element={
                <PublicOnlyRoute>
                  <GetStarted />
                </PublicOnlyRoute>
              }
            />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard/candidate/*"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/mentor/*"
              element={
                <ProtectedRoute allowedRoles={['mentor']}>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employer/*"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <EmployerDashboard />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Chatbot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
