import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
        ${content}
        <div style="padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
            &copy; 2026 St. Joseph's SSS Naggalama ICT Club Hub<br>
            Empowering the next generation of innovators.
        </div>
    </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Generate the secure reset link and OTP
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || "https://clubhub.hakimkavuma.space/reset-password",
      },
    });

    if (error) {
      throw error;
    }

    const resetLink = data.properties.action_link;
    const otp = data.properties.email_otp;

    // 2. Build the premium themed email
    const html = getBaseTemplate(`
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Reset Your Password</h1>
        </div>
        <div style="padding: 40px;">
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">Hello,</p>
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">We received a request to reset your password for your ICT Club Hub account. You can use the code below or click the button to proceed.</p>
            
            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; border: 2px dashed #e5e7eb;">
                <p style="margin-top: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Your Reset Code</p>
                <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #7c3aed; margin: 0;">${otp}</div>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">Reset Password Now</a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
            </p>
        </div>
    `);

    // 3. Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: "Reset Your Password - ICT Club Hub",
        html: html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(resendData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, messageId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Password Reset Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
