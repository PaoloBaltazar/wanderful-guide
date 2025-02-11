
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

    // Try to find existing failed attempts for this email
    const { data: existingAttempt, error: fetchError } = await supabaseAdmin
      .from('failed_login_attempts')
      .select('*')
      .eq('email', email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw fetchError
    }

    if (existingAttempt) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('failed_login_attempts')
        .update({
          attempt_count: existingAttempt.attempt_count + 1,
          last_attempt: new Date().toISOString(),
          ip_address: ip_address || req.headers.get('x-real-ip')
        })
        .eq('id', existingAttempt.id)

      if (updateError) throw updateError
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from('failed_login_attempts')
        .insert({
          email,
          ip_address: ip_address || req.headers.get('x-real-ip'),
          attempt_count: 1
        })

      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ message: 'Failed login attempt logged successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in handle-failed-login:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
