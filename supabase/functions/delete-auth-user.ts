
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401, headers: corsHeaders });
    }

    // Create Supabase client to validate the JWT and check permissions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token to validate permissions
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    });

    // Get the current user from the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response("Invalid or expired token", { status: 401, headers: corsHeaders });
    }

    // Check if the user has admin permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response("Unable to verify user permissions", { status: 403, headers: corsHeaders });
    }

    // Check if user is admin (Super Admin or any country admin)
    const isAdmin = profile.role === 'Super Admin' || (profile.role && profile.role.includes('Admin'));
    if (!isAdmin) {
      return new Response("Insufficient permissions - admin access required", { status: 403, headers: corsHeaders });
    }

    const { userId } = await req.json();

    if (!userId || !supabaseServiceKey || !supabaseUrl) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    // Make the API call to delete the user using service key (server-side only)
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to delete auth user ${userId}:`, errorText);
      return new Response(`Failed to delete user: ${errorText}`, { status: 500, headers: corsHeaders });
    }

    console.log(`User ${userId} deleted successfully by admin ${user.id}`);
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error in delete-auth-user function:', error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
