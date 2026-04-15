import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FolderKanban, GitCommit, GitPullRequest } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Run initial queries in parallel
  const [{ data: userData }, { data: memberships, count: projectsCount }] = await Promise.all([
    supabase
      .from("users")
      .select("github_username")
      .eq("id", user?.id || "")
      .single(),
    supabase
      .from("project_members")
      .select("project_id", { count: "exact" })
      .eq("user_id", user?.id || ""),
  ]);

  const githubUsername = userData?.github_username;
  const projectIds = memberships?.map((m) => m.project_id) || [];

  // Get repository IDs
  const { data: repos } = projectIds.length > 0
    ? await supabase.from("repositories").select("id").in("project_id", projectIds)
    : { data: [] };

  const repoIds = repos?.map((r) => r.id) || [];

  // Run stats queries in parallel
  const [{ count: commitsCount }, { count: prsCount }, { data: recentCommits }] =
    repoIds.length > 0 && githubUsername
      ? await Promise.all([
          supabase
            .from("commits")
            .select("*", { count: "exact", head: true })
            .in("repository_id", repoIds)
            .eq("author_github_username", githubUsername),
          supabase
            .from("pull_requests")
            .select("*", { count: "exact", head: true })
            .in("repository_id", repoIds)
            .eq("author_github_username", githubUsername),
          supabase
            .from("commits")
            .select("id, sha, message, committed_at, repository:repositories(github_full_name)")
            .in("repository_id", repoIds)
            .eq("author_github_username", githubUsername)
            .order("committed_at", { ascending: false })
            .limit(5),
        ])
      : [{ count: 0 }, { count: 0 }, { data: [] }];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your activity.
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active projects you&apos;re a member of
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Commits</CardTitle>
            <GitCommit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commitsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {commitsCount ? "Across all your projects" : "Sync repos to see stats"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Pull Requests</CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {prsCount ? "Across all your projects" : "Sync repos to see stats"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started / Recent Activity */}
      {projectsCount === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your first project to start tracking engineering activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">
                Create a project and connect your GitHub repositories to start
                tracking commits, pull requests, and team activity.
              </p>
              <Link href="/dashboard/projects/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Recent Activity</CardTitle>
            <CardDescription>
              Your latest commits across all projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCommits && recentCommits.length > 0 ? (
              <div className="space-y-4">
                {recentCommits.map((commit) => {
                  const repo = Array.isArray(commit.repository)
                    ? commit.repository[0]
                    : commit.repository;
                  return (
                    <div key={commit.id} className="flex items-start gap-3">
                      <GitCommit className="mt-1 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {commit.message.split("\n")[0].slice(0, 60)}
                          {commit.message.length > 60 ? "..." : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {repo?.github_full_name} · {new Date(commit.committed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/dashboard/projects"
                  className="block text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  View all activity →
                </Link>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No recent activity. Sync your repositories to see your commits here.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
