
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { userId, serviceKey } = await req.json();

  // Security: the serviceKey must match
  if (serviceKey !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Supabase project ref
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!userId || !adminKey || !supabaseUrl) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Make the API call to delete the user as an admin
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      "apikey": adminKey,
      "Authorization": `Bearer ${adminKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    return new Response(`Failed to delete user: ${errorText}`, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
