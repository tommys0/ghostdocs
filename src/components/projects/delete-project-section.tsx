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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteProjectSectionProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectSection({ projectId, projectName }: DeleteProjectSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== projectName) {
      toast.error("Please type the project name correctly");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      toast.success("Project deleted");
      router.push("/dashboard/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </div>
        <CardDescription>
          Irreversible and destructive actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
          <div>
            <p className="font-medium">Delete this project</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete this project and all of its data. This action cannot be undone.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button variant="destructive" />}>
              Delete Project
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Project</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the project
                  <strong> {projectName}</strong> and all associated data including:
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>All team members and invitations</li>
                <li>All connected repositories</li>
                <li>All commits and pull request history</li>
                <li>All reports and changelogs</li>
                <li>All webhooks and integrations</li>
              </ul>
              <div className="space-y-2 pt-4">
                <Label htmlFor="confirm">
                  Type <strong>{projectName}</strong> to confirm:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectName}
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setConfirmText("");
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading || confirmText !== projectName}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Project"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
