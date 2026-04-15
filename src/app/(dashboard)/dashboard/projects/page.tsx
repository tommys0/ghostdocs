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
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, GitBranch } from "lucide-react";

interface ProjectWithRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  role: string;
}

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's projects with their role
  const { data: memberships } = await supabase
    .from("project_members")
    .select(
      `
      role,
      project:projects (
        id,
        name,
        description,
        created_at
      )
    `
    )
    .eq("user_id", user?.id || "")
    .order("joined_at", { ascending: false });

  const projects: ProjectWithRole[] = (memberships || [])
    .filter((m): m is typeof m & { project: { id: string; name: string; description: string | null; created_at: string } } =>
      m.project !== null && typeof m.project === 'object' && !Array.isArray(m.project)
    )
    .map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      created_at: m.project.created_at,
      role: m.role as string,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and connected repositories.
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              Create a project to start tracking your GitHub repositories and
              team activity.
            </p>
            <Link href="/dashboard/projects/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {project.role}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(project.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
