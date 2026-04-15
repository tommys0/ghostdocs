import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

    const { projectId, email, role } = await request.json();

    if (!projectId || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user can manage this project (use admin client to bypass RLS)
    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
      return NextResponse.json({ error: "You don't have permission to invite members" }, { status: 403 });
    }

    // Check if already invited
    const { data: existingInvite } = await supabaseAdmin
      .from("project_invitations")
      .select("id")
      .eq("project_id", projectId)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 400 });
    }

    // Create invitation (use admin client to bypass RLS)
    const { data: invitation, error } = await supabaseAdmin
      .from("project_invitations")
      .insert({
        project_id: projectId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
      })
      .select("id, token")
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token: invitation.token,
      }
    });
  } catch (error) {
    console.error("Error in create invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
