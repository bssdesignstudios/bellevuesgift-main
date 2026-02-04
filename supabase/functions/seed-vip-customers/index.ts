import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoCustomers = [
      { name: "Alicia Rolle", email: "alicia@demo.com", phone: "+1 (242) 555-0101", island: "Grand Bahama" },
      { name: "Dwayne Johnson", email: "dwayne@demo.com", phone: "+1 (242) 555-0102", island: "New Providence" },
      { name: "Shanice Smith", email: "shanice@demo.com", phone: "+1 (242) 555-0103", island: "Abaco" },
    ];

    const results = [];

    for (const customer of demoCustomers) {
      // Check if auth user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === customer.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email: customer.email, status: "exists", userId });
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: customer.email,
          password: "DemoPass123!",
          email_confirm: true,
        });

        if (authError) {
          results.push({ email: customer.email, status: "error", error: authError.message });
          continue;
        }
        userId = authData.user.id;
        results.push({ email: customer.email, status: "created", userId });
      }

      // Check if customer profile exists
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", customer.email)
        .maybeSingle();

      if (existingCustomer) {
        // Update existing customer
        await supabase
          .from("customers")
          .update({
            auth_user_id: userId,
            is_favorite: true,
            name: customer.name,
            phone: customer.phone,
            island: customer.island,
          })
          .eq("id", existingCustomer.id);
      } else {
        // Create customer profile
        await supabase
          .from("customers")
          .insert({
            auth_user_id: userId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            island: customer.island,
            is_favorite: true,
          });
      }
    }

    // Add some wishlist items for Alicia
    const { data: aliciaCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", "alicia@demo.com")
      .maybeSingle();

    if (aliciaCustomer) {
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("is_active", true)
        .limit(5);

      if (products?.length) {
        for (const product of products.slice(0, 3)) {
          await supabase
            .from("wishlists")
            .upsert({
              customer_id: aliciaCustomer.id,
              product_id: product.id,
            }, { onConflict: 'customer_id,product_id' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
