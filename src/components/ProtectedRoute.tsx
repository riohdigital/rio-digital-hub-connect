
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading indicator only for a reasonable time (prevent infinite loading)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated after loading completes, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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
