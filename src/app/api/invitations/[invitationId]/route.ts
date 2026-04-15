import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// DELETE - Cancel/delete an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get invitation to check project
  const { data: invitation } = await supabaseAdmin
    .from("project_invitations")
    .select("id, project_id")
    .eq("id", invitationId)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  // Check if user can manage this project
  const { data: membership } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", invitation.project_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete invitation
  const { error } = await supabaseAdmin
    .from("project_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
