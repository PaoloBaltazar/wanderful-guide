
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface IPAccessGuardProps {
  children: React.ReactNode;
}

export const IPAccessGuard = ({ children }: IPAccessGuardProps) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validateIP = async () => {
      try {
        console.log('Validating IP address...');
        const { data: validationData, error } = await supabase.functions.invoke<{ 
          allowed: boolean,
          message?: string,
          ip?: string,
          error?: string 
        }>('validate-ip');
        
        if (error) {
          console.error('Error validating IP:', error);
          // Continue with access in case of error
          setIsAllowed(true);
          return;
        }

        console.log('Validation response:', validationData);
        setIsAllowed(validationData?.allowed ?? false);
        
        // If IP is not allowed, redirect to unauthorized page
        if (!validationData?.allowed) {
          toast({
            title: "Access Denied",
            description: "Your IP address is not authorized to access this application.",
            variant: "destructive",
          });
          navigate("/unauthorized");
        }
      } catch (error) {
        console.error('Error validating IP:', error);
        // Continue with access in case of error
        setIsAllowed(true);
      }
    };

    validateIP();
  }, [navigate, toast]);

  // Show nothing while checking IP access
  if (isAllowed === null) {
    return null;
  }

  // If IP is allowed, render children
  return isAllowed ? <>{children}</> : null;
};
