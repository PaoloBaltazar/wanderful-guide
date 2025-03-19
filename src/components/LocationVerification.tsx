
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LocationVerificationProps {
  children: React.ReactNode;
}

const LocationVerification = ({ children }: LocationVerificationProps) => {
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Verifying your location...");
  const navigate = useNavigate();
  const { toast } = useToast();

  const verifyLocation = async () => {
    setVerifying(true);
    setError(null);
    
    try {
      // First try to get user's precise location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Got GPS position, now verify with server
            await checkLocationWithServer({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          async (geoError) => {
            // Geolocation failed, try IP-based verification as fallback
            console.warn("Geolocation error:", geoError.message);
            setMessage("Could not access precise location. Trying IP-based verification...");
            await checkLocationWithServer({});
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        // Browser doesn't support geolocation, use IP only
        setMessage("Your browser doesn't support geolocation. Trying IP-based verification...");
        await checkLocationWithServer({});
      }
    } catch (err: any) {
      console.error("Location verification error:", err);
      setError(err.message || "Failed to verify location");
      setVerifying(false);
    }
  };

  const checkLocationWithServer = async ({ 
    latitude, 
    longitude 
  }: { 
    latitude?: number; 
    longitude?: number;
  }) => {
    try {
      const response = await supabase.functions.invoke('verify-location', {
        body: {
          ipAddress: null, // Server will get this from the request headers
          latitude,
          longitude
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.accessAllowed) {
        setVerified(true);
        setMessage("Location verified. Welcome!");
        toast({
          title: "Access granted",
          description: "Your location has been verified",
        });
      } else {
        setError("Access to this application is restricted based on location.");
        setMessage("Location verification failed");
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "You're not at an authorized location",
        });
      }
    } catch (err: any) {
      console.error("Server verification error:", err);
      setError(err.message || "Failed to communicate with verification server");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    verifyLocation();
  }, []);

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center">
            <MapPin className="mr-2 h-6 w-6" />
            Location Verification
          </CardTitle>
          <CardDescription>
            Access to this application requires location verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-center py-4">
            {verifying ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p>{message}</p>
              </>
            ) : (
              <p className="font-medium">{message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={verifyLocation} 
            disabled={verifying} 
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LocationVerification;
