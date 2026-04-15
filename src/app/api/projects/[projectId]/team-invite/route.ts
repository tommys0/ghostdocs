import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// GET - Get current team invite settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user can manage this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get project team invite settings
  const { data: project } = await supabase
    .from("projects")
    .select("team_invite_token, team_invite_role, team_invite_enabled")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    token: project.team_invite_token,
    role: project.team_invite_role,
    enabled: project.team_invite_enabled,
  });
}

// POST - Generate or regenerate team invite link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user can manage this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { role = "member" } = await request.json().catch(() => ({}));

  // Generate new token
  const token = randomBytes(32).toString("hex");

  // Update project with new token (use admin to bypass RLS for update)
  const { error } = await supabaseAdmin
    .from("projects")
    .update({
      team_invite_token: token,
      team_invite_role: role,
      team_invite_enabled: true,
    })
    .eq("id", projectId);

  if (error) {
    console.error("Error generating team invite:", error);
    return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    role,
    enabled: true,
  });
}

// PATCH - Update team invite settings (enable/disable, change role)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user can manage this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { enabled, role } = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof enabled === "boolean") updates.team_invite_enabled = enabled;
  if (role) updates.team_invite_role = role;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select("team_invite_token, team_invite_role, team_invite_enabled")
    .single();

  if (error) {
    console.error("Error updating team invite:", error);
    return NextResponse.json({ error: "Failed to update invite settings" }, { status: 500 });
  }

  return NextResponse.json({
    token: data.team_invite_token,
    role: data.team_invite_role,
    enabled: data.team_invite_enabled,
  });
}

// DELETE - Disable team invite link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user can manage this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("projects")
    .update({
      team_invite_token: null,
      team_invite_enabled: false,
    })
    .eq("id", projectId);

  if (error) {
    console.error("Error disabling team invite:", error);
    return NextResponse.json({ error: "Failed to disable invite link" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
