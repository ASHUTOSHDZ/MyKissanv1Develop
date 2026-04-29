import { useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-secondary/50">
        Loading…
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
};
