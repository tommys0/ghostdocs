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

  // Find the project by team invite token (use admin to bypass RLS)
  const { data: project, error: findError } = await supabaseAdmin
    .from("projects")
    .select("id, name, team_invite_role, team_invite_enabled")
    .eq("team_invite_token", token)
    .eq("team_invite_enabled", true)
    .single();

  if (findError || !project) {
    return NextResponse.json(
      { error: "Invalid or disabled invite link" },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return NextResponse.json({
      success: true,
      message: "You're already a member of this project",
      projectId: project.id,
    });
  }

  // Add user to project (use admin to bypass RLS)
  const { error: memberError } = await supabaseAdmin.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: project.team_invite_role || "member",
  });

  if (memberError) {
    console.error("Error adding member:", memberError);
    return NextResponse.json(
      { error: "Failed to join project" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `You've joined ${project.name}!`,
    projectId: project.id,
  });
}
