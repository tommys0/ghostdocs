import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinProject } from "./join-project";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get project by team invite token (use admin to bypass RLS)
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, team_invite_role, team_invite_enabled")
    .eq("team_invite_token", token)
    .eq("team_invite_enabled", true)
    .single();

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
          <p className="mt-2 text-muted-foreground">
            This invite link is invalid or has been disabled.
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to signup with return URL
  if (!user) {
    const returnUrl = `/join/${token}`;
    redirect(`/signup?next=${encodeURIComponent(returnUrl)}`);
  }

  // Check if already a member
  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    redirect(`/dashboard/projects/${project.id}`);
  }

  // Show join UI
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <JoinProject
        token={token}
        projectName={project.name}
        role={project.team_invite_role || "member"}
      />
    </div>
  );
}
