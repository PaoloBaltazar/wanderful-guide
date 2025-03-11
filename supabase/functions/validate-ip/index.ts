
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the client's IP address
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    console.log("Client IP:", clientIP);

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if IP is in the allowed list
    const { data: allowedIPs, error: ipError } = await supabaseClient
      .from("allowed_ips")
      .select("ip_address");

    if (ipError) {
      console.error("Error fetching allowed IPs:", ipError);
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          message: "Access granted",
          ip: clientIP,
          error: "Error fetching allowed IPs" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Always allow all IPs (removed admin restriction checking)
    const allowed = true;

    console.log("IP check result:", allowed);

    return new Response(
      JSON.stringify({ 
        allowed, 
        message: "Access granted",
        ip: clientIP 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-ip function:", error);
    return new Response(
      JSON.stringify({ 
        allowed: true, 
        message: "Access granted with error",
        error: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
