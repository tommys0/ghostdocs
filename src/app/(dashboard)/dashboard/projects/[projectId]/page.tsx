import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepositorySelector } from "@/components/projects/repository-selector";
import { ConnectedRepos } from "@/components/projects/connected-repos";
import { ActivityFeed } from "@/components/projects/activity-feed";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRoleLabel } from "@/lib/roles";
import { Users } from "lucide-react";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get project membership first (needed to validate access)
  const { data: membership } = await supabase
    .from("project_members")
    .select(`
      role,
      project:projects (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.project) {
    notFound();
  }

  const projectData = Array.isArray(membership.project)
    ? membership.project[0]
    : membership.project;

  if (!projectData) {
    notFound();
  }

  const project = projectData as {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  };

  const canManage = membership.role === "owner" || membership.role === "manager";
  const userRole = membership.role as "owner" | "manager" | "member";

  // Run independent queries in parallel
  const [
    { data: repositories },
    { data: userData },
    { data: teamMembers },
    { data: pendingInvitations },
  ] = await Promise.all([
    supabase
      .from("repositories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("github_access_token, github_username")
      .eq("id", user.id)
      .single(),
    supabase
      .from("project_members")
      .select("id, role, user:users(id, name, email, github_username, avatar_url)")
      .eq("project_id", projectId),
    canManage
      ? supabase
          .from("project_invitations")
          .select("id, email, role, created_at")
          .eq("project_id", projectId)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const hasGitHubToken = !!userData?.github_access_token;
  const repoIds = repositories?.map((r) => r.id) || [];

  // Fetch commits and PRs in parallel (depends on repoIds)
  const [{ data: commits }, { data: pullRequests }] = repoIds.length > 0
    ? await Promise.all([
        supabase
          .from("commits")
          .select("id, sha, message, author_github_username, committed_at, additions, deletions, repository:repositories(github_full_name)")
          .in("repository_id", repoIds)
          .order("committed_at", { ascending: false })
          .limit(50),
        supabase
          .from("pull_requests")
          .select("id, github_pr_number, title, status, author_github_username, created_at, merged_at, repository:repositories(github_full_name)")
          .in("repository_id", repoIds)
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: [] }, { data: [] }];

  // Calculate contributor stats from commits and PRs
  const contributorStats = (() => {
    const stats: Record<string, { commits: number; pullRequests: number }> = {};

    (commits || []).forEach((c) => {
      const username = c.author_github_username;
      if (!stats[username]) stats[username] = { commits: 0, pullRequests: 0 };
      stats[username].commits++;
    });

    (pullRequests || []).forEach((pr) => {
      const username = pr.author_github_username;
      if (!stats[username]) stats[username] = { commits: 0, pullRequests: 0 };
      stats[username].pullRequests++;
    });

    return Object.entries(stats)
      .map(([username, data]) => ({ username, ...data }))
      .sort((a, b) => (b.commits + b.pullRequests) - (a.commits + a.pullRequests));
  })();

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant="secondary">
              {getRoleLabel(userRole)}
            </Badge>
          </div>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      {/* Repository Section */}
      {repositories && repositories.length > 0 ? (
        <ConnectedRepos
          repositories={repositories}
          projectId={projectId}
          canManage={canManage}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connect Repositories</CardTitle>
            <CardDescription>
              Select GitHub repositories to track commits, pull requests, and team activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasGitHubToken ? (
              <RepositorySelector projectId={projectId} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Your GitHub token is missing. Please sign out and sign in again with GitHub to grant repository access.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Preview */}
      {teamMembers && teamMembers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team</CardTitle>
              <CardDescription>
                {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                {pendingInvitations && pendingInvitations.length > 0 &&
                  ` · ${pendingInvitations.length} pending invitation${pendingInvitations.length !== 1 ? "s" : ""}`
                }
              </CardDescription>
            </div>
            <Link href={`/dashboard/projects/${projectId}/team`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Manage Team
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 8).map((member) => {
                const memberUser = Array.isArray(member.user) ? member.user[0] : member.user;
                if (!memberUser) return null;
                const initials = memberUser.name
                  ? memberUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                  : memberUser.email[0].toUpperCase();
                return (
                  <Avatar key={member.id} className="h-9 w-9 border-2 border-background">
                    <AvatarImage
                      src={
                        memberUser.avatar_url ||
                        (memberUser.github_username
                          ? `https://github.com/${memberUser.github_username}.png`
                          : undefined)
                      }
                    />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                );
              })}
              {teamMembers.length > 8 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{teamMembers.length - 8}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      {repositories && repositories.length > 0 && (
        <ActivityFeed
          commits={(commits || []).map((c) => ({
            ...c,
            repository: Array.isArray(c.repository) ? c.repository[0] : c.repository,
          }))}
          pullRequests={(pullRequests || []).map((pr) => ({
            ...pr,
            repository: Array.isArray(pr.repository) ? pr.repository[0] : pr.repository,
          }))}
          repositories={repositories.map(r => ({ id: r.id, github_full_name: r.github_full_name }))}
          userRole={userRole}
          currentUserGithubUsername={userData?.github_username}
        />
      )}
    </div>
  );
}
