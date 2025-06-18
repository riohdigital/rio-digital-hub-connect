
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  console.log("[ProtectedRoute] Current state:", { 
    loading, 
    isAuthenticated: !!user,
    userId: user?.id,
    path: location.pathname
  });

  // Mostra indicador de carregamento enquanto verifica o estado de autenticação
  if (loading) {
    console.log("[ProtectedRoute] Still loading auth state...");
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Verificando autenticação...</span>
      </div>
    );
  }

  // Se não estiver autenticado após o carregamento, redireciona para login
  if (!user) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("[ProtectedRoute] User is authenticated, rendering protected content");
  
  // Usuário autenticado, renderiza a rota protegida
  return <Outlet />;
}
