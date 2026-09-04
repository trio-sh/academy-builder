import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";

/** Scroll to top on every navigation; respect hash anchors */
function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    // Always scroll to top first, even with hash links
    window.scrollTo(0, 0);

    if (location.hash) {
      // Hash links: scroll to the target element after page loads and renders
      const timer = setTimeout(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.key]);
  return null;
}

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
import BlogPost from "./pages/BlogPost";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";
import ApiTestChat from "./pages/ApiTestChat";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import VerifyPassport from "./pages/VerifyPassport";
import VerifyBER from "./pages/VerifyBER";
import VerifyReportToken from "./pages/VerifyReportToken";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Join from "./pages/Join";
import WrFreeProductPage from "./pages/wr-free/ProductPage";
import WrFreeAccountGate from "./pages/wr-free/AccountGate";
import WrFreeModuleRunner from "./pages/wr-free/ModuleRunner";
import WrFreeBetweenModules from "./pages/wr-free/BetweenModules";
import WrFreeEndOfProduct from "./pages/wr-free/EndOfProduct";

// Dashboard pages
import CandidateDashboard from "./pages/dashboard/CandidateDashboard";
import MentorDashboard from "./pages/dashboard/MentorDashboard";
import EmployerDashboard from "./pages/dashboard/EmployerDashboard";
import SchoolDashboard from "./pages/dashboard/SchoolDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

import { Chatbot } from "./components/Chatbot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
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
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />

            {/* T3A-DEV-INS-WR-FREE-001 · The Moment You Notice */}
            <Route path="/wr-free" element={<WrFreeProductPage />} />
            <Route path="/wr-free/the-moment-you-notice" element={<WrFreeProductPage />} />
            <Route path="/wr-free/start" element={<WrFreeAccountGate />} />
            <Route path="/wr-free/module/:moduleCode" element={<WrFreeModuleRunner />} />
            <Route path="/wr-free/between" element={<WrFreeBetweenModules />} />
            <Route path="/wr-free/end" element={<WrFreeEndOfProduct />} />

            {/* Auth callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />

            {/* Password reset */}
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Behavioral Evidence Report verification (public) */}
            <Route path="/verify" element={<VerifyBER />} />
            <Route path="/verify/ber/:id" element={<VerifyBER />} />
            <Route path="/verify/token" element={<VerifyReportToken />} />
            <Route path="/verify/token/:token" element={<VerifyReportToken />} />
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
              element={<GetStarted />}
            />
            <Route
              path="/join"
              element={
                <PublicOnlyRoute>
                  <Join />
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
            <Route
              path="/dashboard/school/*"
              element={
                <ProtectedRoute allowedRoles={['school_admin']}>
                  <SchoolDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* API test chat page */}
            <Route path="/test-chat" element={<ApiTestChat />} />

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
