import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ProjectSettingsForm } from "@/components/projects/project-settings-form";
import { DeleteProjectSection } from "@/components/projects/delete-project-section";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Get project membership
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  const isOwner = membership.role === "owner";
  const canManage = isOwner || membership.role === "manager";

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage project settings.
          </p>
        </div>
      </div>
    );
  }

  // Get project details
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name, description, allowed_email_domain")
    .eq("id", projectId)
    .single();

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your project settings and preferences.
        </p>
      </div>

      <ProjectSettingsForm
        projectId={project.id}
        initialData={{
          name: project.name,
          description: project.description || "",
          allowedEmailDomain: project.allowed_email_domain || "",
        }}
      />

      {isOwner && (
        <DeleteProjectSection projectId={project.id} projectName={project.name} />
      )}
    </div>
  );
}
