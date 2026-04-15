import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId, email, projectName, role, inviterName } = await request.json();

    if (!invitationId || !email || !projectName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the invitation to verify it exists and get the token (use admin to bypass RLS)
    const { data: invitation } = await supabaseAdmin
      .from("project_invitations")
      .select("id, token")
      .eq("id", invitationId)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${invitation.token}`;

    const roleLabel = role === "manager" ? "Manager" : "Engineer";

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "GhostDoc <onboarding@resend.dev>",
      to: email,
      subject: `You've been invited to join ${projectName} on GhostDoc`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">GhostDoc</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="margin-top: 0;">You're invited!</h2>
              <p>${inviterName ? `<strong>${inviterName}</strong> has` : "You've been"} invited you to join <strong>${projectName}</strong> as a <strong>${roleLabel}</strong>.</p>
              <p>GhostDoc helps engineering teams track activity, generate changelogs, and stay aligned.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Accept Invitation</a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a></p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
