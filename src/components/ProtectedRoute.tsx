
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect } from "react";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Debug loading state
  useEffect(() => {
    console.log("Protected route loading state:", loading);
    console.log("User authenticated:", !!user);
  }, [loading, user]);

  // Show loading indicator
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated after loading completes, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("Rendering protected content");
  
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
