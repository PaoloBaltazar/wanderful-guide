
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationVerificationRequest {
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
}

// Coordinates for Clark Freeport Zone, Pampanga, Philippines
const ALLOWED_LOCATION = {
  latitude: 15.1840, // Approximate latitude for Clark Freeport Zone
  longitude: 120.5560, // Approximate longitude for Clark Freeport Zone
  radiusKm: 1.0 // Allowed radius in kilometers
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get request data
    const { ipAddress, latitude, longitude } = await req.json() as LocationVerificationRequest;
    
    console.log("Verifying location:", { ipAddress, latitude, longitude });
    
    let locationVerified = false;
    
    // Verify coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        ALLOWED_LOCATION.latitude, 
        ALLOWED_LOCATION.longitude
      );
      
      console.log(`Distance from allowed location: ${distance.toFixed(2)} km`);
      locationVerified = distance <= ALLOWED_LOCATION.radiusKm;
      
      if (locationVerified) {
        console.log("Location verified by GPS coordinates");
      }
    }
    
    // Also verify IP if provided (as a backup method)
    let ipVerified = false;
    if (ipAddress) {
      // Check if IP is in the allowed list
      const { data: authorized, error } = await supabaseClient.rpc(
        'check_ip_authorization',
        { check_ip: ipAddress }
      );
      
      if (error) {
        console.error("Error checking IP authorization:", error);
      } else {
        ipVerified = authorized === true;
        console.log(`IP verification result: ${ipVerified ? 'Authorized' : 'Unauthorized'}`);
      }
    }
    
    // Access is allowed if either location or IP is verified
    const accessAllowed = locationVerified || ipVerified;
    
    return new Response(
      JSON.stringify({
        accessAllowed,
        locationVerified,
        ipVerified,
        message: accessAllowed 
          ? "Access granted" 
          : "Access to this application is restricted based on location."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        accessAllowed: false,
        error: "Error processing location verification",
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
