"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProjectSettingsFormProps {
  projectId: string;
  initialData: {
    name: string;
    description: string;
    allowedEmailDomain: string;
  };
}

export function ProjectSettingsForm({ projectId, initialData }: ProjectSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [allowedEmailDomain, setAllowedEmailDomain] = useState(initialData.allowedEmailDomain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          allowed_email_domain: allowedEmailDomain.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update project");
      }

      toast.success("Project settings updated");
      router.refresh();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update project");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    name !== initialData.name ||
    description !== initialData.description ||
    allowedEmailDomain !== initialData.allowedEmailDomain;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Basic information about your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project..."
              rows={3}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Helps team members understand what this project is about.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailDomain">Allowed Email Domain</Label>
            <Input
              id="emailDomain"
              value={allowedEmailDomain}
              onChange={(e) => setAllowedEmailDomain(e.target.value)}
              placeholder="@company.com"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Only users with this email domain can join via team invite link.
              Leave empty to allow any email.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !hasChanges}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
