
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const [message, setMessage] = useState("Finalizing authentication...");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract access_token and refresh_token from the URL if they exist
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        
        // If we have tokens in the URL, set the session manually
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            throw error;
          }
        }

        // Check if the user is authenticated
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          // User is authenticated
          setMessage("Authentication successful! Redirecting...");
          toast({
            title: "Authentication successful",
            description: "You have been logged in successfully.",
          });
          setTimeout(() => navigate("/"), 1500);
        } else {
          // No session found
          setMessage("Authentication failed. Please try logging in again.");
          toast({
            title: "Authentication failed",
            description: "Please try logging in again.",
            variant: "destructive"
          });
          setTimeout(() => navigate("/login"), 1500);
        }
      } catch (error: any) {
        console.error("Error during auth callback:", error);
        setMessage("Something went wrong. Redirecting to login...");
        toast({
          title: "Authentication error",
          description: error.message || "Please try logging in again.",
          variant: "destructive"
        });
        setTimeout(() => navigate("/login"), 1500);
      }
    };

    handleAuthCallback();
  }, [navigate, location.hash, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="rounded-lg bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="text-xl font-medium">{message}</h1>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
