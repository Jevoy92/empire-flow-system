import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/contexts/SessionContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { DemoBanner } from "@/components/DemoBanner";
import { Navigation } from "@/components/Navigation";
import { MiniSession } from "@/components/MiniSession";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Index from "./pages/Index";
import History from "./pages/History";
import Workflows from "./pages/Workflows";
import Session from "./pages/Session";
import WorkflowReview from "./pages/WorkflowReview";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const isDemo = location.search.includes('demo=1');
  
  const routes = (
    <LayoutGroup id="app-layout">
      <Navigation />
      <MiniSession />
      {isDemo && <DemoBanner />}
      <div className={isDemo ? 'pt-10' : ''}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${location.pathname}${location.search}`}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14, filter: 'blur(2px)' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10, filter: 'blur(2px)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<Index />} />
              <Route path="/history" element={
                <ProtectedRoute><History /></ProtectedRoute>
              } />
              <Route path="/workflows" element={
                <ProtectedRoute><Workflows /></ProtectedRoute>
              } />
              {/* Redirects for old routes */}
              <Route path="/templates" element={<Navigate to="/workflows" replace />} />
              <Route path="/projects" element={<Navigate to="/workflows" replace />} />
              <Route path="/session" element={
                <ProtectedRoute><Session /></ProtectedRoute>
              } />
              <Route path="/workflow-review" element={
                <ProtectedRoute><WorkflowReview /></ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={
                <ProtectedRoute><Onboarding /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Settings /></ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
  
  // Wrap with DemoProvider when in demo mode
  if (isDemo) {
    return <DemoProvider>{routes}</DemoProvider>;
  }
  
  return routes;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <SessionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SessionProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
