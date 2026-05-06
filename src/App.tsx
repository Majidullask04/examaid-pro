import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import SubjectSelector from "./pages/SubjectSelector";
import SubjectUnits from "./pages/SubjectUnits";
import UnitQuestions from "./pages/UnitQuestions";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import JNTUH from "./pages/JNTUH";
import Predictions from "./pages/Predictions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/subjects" element={<SubjectSelector />} />
            <Route path="/subjects/:subjectId" element={<SubjectUnits />} />
            <Route path="/units/:unitId" element={<UnitQuestions />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/jntuh" element={<JNTUH />} />
            <Route path="/predictions/:subjectCode" element={<Predictions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
