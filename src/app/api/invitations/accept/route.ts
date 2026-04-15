import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Find the invitation (use admin client - token acts as auth)
  const { data: invitation, error: findError } = await supabaseAdmin
    .from("project_invitations")
    .select("*, project:projects(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (findError || !invitation) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 404 }
    );
  }

  // Check if invitation is for this user's email
  if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation is for a different email address" },
      { status: 403 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", invitation.project_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    // Mark invitation as accepted anyway
    await supabaseAdmin
      .from("project_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return NextResponse.json({
      success: true,
      message: "You're already a member of this project",
      projectId: invitation.project_id,
    });
  }

  // Add user to project (use admin client - user isn't a member yet)
  const { error: memberError } = await supabaseAdmin.from("project_members").insert({
    project_id: invitation.project_id,
    user_id: user.id,
    role: invitation.role,
    invited_by: invitation.invited_by,
  });

  if (memberError) {
    console.error("Error adding member:", memberError);
    return NextResponse.json(
      { error: "Failed to join project" },
      { status: 500 }
    );
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from("project_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return NextResponse.json({
    success: true,
    message: `You've joined ${invitation.project?.name || "the project"}`,
    projectId: invitation.project_id,
  });
}
