import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TeamMembers } from "@/components/projects/team-members";
import { TeamInviteLink } from "@/components/projects/team-invite-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRoleLabel } from "@/lib/roles";

interface TeamPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get project membership
  const { data: membership } = await supabase
    .from("project_members")
    .select(`
      role,
      project:projects (id, name)
    `)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.project) {
    notFound();
  }

  const project = Array.isArray(membership.project)
    ? membership.project[0]
    : membership.project;

  const canManage = membership.role === "owner" || membership.role === "manager";

  // Use admin client to fetch team data (RLS on users table can block joins)
  const supabaseAdmin = createServiceClient();

  // Fetch team data in parallel
  const [membersResult, invitationsResult] = await Promise.all([
    supabaseAdmin
      .from("project_members")
      .select("id, role, joined_at, user_id")
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true }),
    canManage
      ? supabaseAdmin
          .from("project_invitations")
          .select("id, email, role, created_at")
          .eq("project_id", projectId)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Fetch user details for all members
  const userIds = membersResult.data?.map((m) => m.user_id) || [];
  const { data: usersData } = userIds.length > 0
    ? await supabaseAdmin
        .from("users")
        .select("id, name, email, github_username, avatar_url")
        .in("id", userIds)
    : { data: [] };

  // Combine members with user data
  const teamMembers = membersResult.data?.map((member) => ({
    ...member,
    user: usersData?.find((u) => u.id === member.user_id) || null,
  })) || [];

  const pendingInvitations = invitationsResult.data;

  // Group members by role
  const owners = teamMembers?.filter((m) => m.role === "owner") || [];
  const managers = teamMembers?.filter((m) => m.role === "manager") || [];
  const members = teamMembers?.filter((m) => m.role === "member") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground">
          Manage team members and invitations for {project?.name}.
        </p>
      </div>

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{owners.length}</div>
            <p className="text-xs text-muted-foreground">Full project access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers.length}</div>
            <p className="text-xs text-muted-foreground">Can manage team & reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engineers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Personal activity access</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Component */}
      <TeamMembers
        projectId={projectId}
        projectName={project?.name || ""}
        members={(teamMembers || []).map((m) => ({
          ...m,
          role: m.role as "owner" | "manager" | "member",
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        }))}
        pendingInvitations={(pendingInvitations || []).map((inv) => ({
          ...inv,
          role: inv.role as "manager" | "member",
        }))}
        canManage={canManage}
        currentUserId={user.id}
      />

      {/* Team Invite Link - only for managers/owners */}
      {canManage && <TeamInviteLink projectId={projectId} />}

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            What each role can do in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Owner</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full project access</li>
                  <li>• Manage all settings</li>
                  <li>• Invite & remove members</li>
                  <li>• Delete project</li>
                  <li>• View all team activity</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Manager</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View team activity</li>
                  <li>• Generate reports</li>
                  <li>• Invite members</li>
                  <li>• Connect repositories</li>
                  <li>• Cannot delete project</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Engineer</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View personal activity</li>
                  <li>• See project updates</li>
                  <li>• Cannot view team stats</li>
                  <li>• Cannot invite members</li>
                  <li>• Cannot manage settings</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
