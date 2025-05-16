
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AssistantChat from "./pages/AssistantChat"; // Usaremos este para todos
import AdminDashboard from "./pages/AdminDashboard"; // Importamos o novo componente
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import AirbnbPricingAgentPage from "./pages/AirbnbPricingAgentPage"; // Importando a nova página

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Rota genérica para todos os assistentes */}
              <Route path="/assistants/:assistantType" element={<AssistantChat />} />
              {/* Rota de administração */}
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Nova rota para o Agente de Precificação Airbnb */}
              <Route path="/airbnb-pricing-agent" element={<AirbnbPricingAgentPage />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
