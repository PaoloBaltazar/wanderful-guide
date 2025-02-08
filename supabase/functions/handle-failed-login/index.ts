
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  email: string
  ip_address?: string
}

serve(async (req) => {
  try {
    const { email, ip_address } = await req.json() as RequestBody
    
    // Get Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Log the failed login attempt
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'FAILED_LOGIN_ATTEMPT',
        table_name: 'auth.users',
        ip_address: ip_address || req.headers.get('x-real-ip'),
        new_data: { email }
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Failed login attempt logged successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
