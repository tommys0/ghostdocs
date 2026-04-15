"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to create a project");
        router.push("/login");
        return;
      }

      // Ensure user exists in users table (for users created before migration)
      const { error: userError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email || "",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      if (userError) {
        console.error("User upsert error:", userError);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Project insert error:", error);
        throw new Error(`Failed to create project: ${error.message}`);
      }

      toast.success("Project created successfully!");
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error: unknown) {
      console.error("Error creating project:", error);
      const message = error instanceof Error
        ? error.message
        : (error as { message?: string })?.message || "Unknown error";
      toast.error(`Failed to create project: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Create a new project</CardTitle>
          <CardDescription>
            Create a project to organize your repositories and track team
            activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/projects">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Next Steps Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next steps</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>After creating your project, you&apos;ll be able to:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Connect GitHub repositories to track activity</li>
            <li>Invite team members to collaborate</li>
            <li>View commits, pull requests, and code reviews</li>
            <li>Generate reports and changelogs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
