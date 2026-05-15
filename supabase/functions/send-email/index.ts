import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Premium Base Template wrapper
 */
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICT Club Hub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
                    <!-- Header with Branding -->
                    <tr>
                        <td align="center" style="padding: 32px 0; background: linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 100%);">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); width: 48px; height: 48px; border-radius: 14px; color: #ffffff; font-weight: 800; font-size: 20px; line-height: 48px;">
                                        ICH
                                    </td>
                                    <td style="padding-left: 14px; text-align: left;">
                                        <div style="font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.025em; line-height: 1;">Club<span style="color: #ec4899;">Hub</span></div>
                                        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">Naggalama</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content Area -->
                    <tr>
                        <td style="padding: 0;">
                            ${content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 40px; background-color: #fcfcfd; border-top: 1px solid #f3f4f6;">
                            <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">
                                &copy; ${new Date().getFullYear()} St. Joseph's SSS Naggalama ICT Club
                            </p>
                            <div style="margin-top: 16px; font-size: 12px; color: #94a3b8; max-width: 400px; line-height: 1.6;">
                                You received this because you're a member of the ICT Club Hub platform.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

/**
 * Template definitions
 */
const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  'approval': (data) => ({
    subject: "Welcome to the Hub! Your account is approved 🚀",
    html: `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Welcome, ${data.name}!</h1>
        </div>
        <div style="padding: 40px;">
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px; line-height: 1.6;">
                Great news! Your account has been <strong>approved</strong> by the club patrons. You now have full access to the ICT Club Hub.
            </p>
            
            <div style="background-color: #f3f4f6; border-radius: 16px; padding: 24px; margin: 32px 0;">
                <h3 style="margin-top: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">What's Next?</h3>
                <ul style="padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                    <li>Participate in coding challenges</li>
                    <li>Join the club chat and collaborate</li>
                    <li>Showcase your projects to the community</li>
                    <li>Earn points and climb the leaderboard</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${data.origin || 'https://clubhub.hakimkavuma.space'}" style="display: inline-block; padding: 14px 32px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.3);">Access Your Dashboard</a>
            </div>

            <p style="font-size: 14px; color: #94a3b8; margin-top: 40px; text-align: center;">
                If you have any questions, reach out in the help channel.
            </p>
        </div>
    `
  }),
  'chat-notification': (data) => ({
    subject: `New message from ${data.senderName}`,
    html: `
        <div style="padding: 40px;">
            <div style="display: flex; align-items: center; margin-bottom: 24px;">
                <div style="background-color: #f5f3ff; color: #7c3aed; padding: 8px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase;">New Message</div>
            </div>
            <p style="font-size: 18px; color: #1e293b; font-weight: 600; margin-bottom: 8px;">${data.senderName} sent you a message</p>
            <p style="font-size: 15px; color: #64748b; margin-bottom: 24px;">"${data.messagePreview}"</p>
            
            <div style="text-align: center; margin-top: 32px;">
                <a href="${data.origin || 'https://clubhub.hakimkavuma.space'}/chat" style="display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Reply in Chat</a>
            </div>
        </div>
    `
  })
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing.");
    }

    const body = await req.json();
    const { to, templateId, templateData, subject: manualSubject, html: manualHtml, text: manualText } = body;

    let finalSubject = manualSubject;
    let finalHtml = manualHtml;

    if (templateId && TEMPLATES[templateId]) {
      const { subject: tSubject, html: tHtml } = TEMPLATES[templateId](templateData || {});
      finalSubject = tSubject;
      finalHtml = getBaseTemplate(tHtml);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject: finalSubject,
        html: finalHtml,
        text: manualText,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Resend API Error");
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function Exception:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
