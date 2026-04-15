import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// DELETE - Remove a member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const { projectId, memberId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get member to check if exists and get user_id
  const { data: memberToRemove } = await supabaseAdmin
    .from("project_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("project_id", projectId)
    .single();

  if (!memberToRemove) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check if user can manage this project (or is removing themselves)
  const { data: currentMembership } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  const isRemovingSelf = memberToRemove.user_id === user.id;
  const canManage = currentMembership?.role === "owner" || currentMembership?.role === "manager";

  // Can't remove owner unless you're the owner removing yourself
  if (memberToRemove.role === "owner" && !isRemovingSelf) {
    return NextResponse.json({ error: "Cannot remove project owner" }, { status: 403 });
  }

  // Must be manager/owner to remove others, or removing self
  if (!isRemovingSelf && !canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete member
  const { error } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
