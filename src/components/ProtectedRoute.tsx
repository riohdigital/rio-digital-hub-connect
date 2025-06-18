
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect } from "react";

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  
  // Enhanced debug logging
  useEffect(() => {
    console.log("[ProtectedRoute] Current state:", { 
      loading, 
      isAuthenticated: !!user,
      userId: user?.id,
      userProfile: profile,
      isAdmin: profile?.role === 'admin',
      path: location.pathname,
      isAdminRoute
    });
  }, [loading, user, profile, location, isAdminRoute]);

  // Show loading indicator while authentication state is being determined
  if (loading) {
    console.log("[ProtectedRoute] Still loading auth state...");
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Verificando autenticação...</span>
      </div>
    );
  }

  // If not authenticated after loading completes, redirect to login
  if (!user) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin routes, check if user has admin role
  if (isAdminRoute && profile?.role !== 'admin') {
    console.log("[ProtectedRoute] User is not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("[ProtectedRoute] User is authenticated, rendering protected content");
  
  // User is authenticated, render the protected route
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
