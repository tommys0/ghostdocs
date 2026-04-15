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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { getRoleLabel } from "@/lib/roles";

interface JoinProjectProps {
  token: string;
  projectName: string;
  role: "manager" | "member" | "viewer";
}

export function JoinProject({ token, projectName, role }: JoinProjectProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join project");
      }

      toast.success(data.message);
      router.push(`/dashboard/projects/${data.projectId}`);
    } catch (error) {
      console.error("Error joining project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join project");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Join {projectName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">Your role will be</p>
          <Badge variant="secondary" className="mt-2 text-base">
            {getRoleLabel(role)}
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            {role === "manager"
              ? "You'll be able to view team activity and generate reports"
              : "You'll be able to view your personal activity and project updates"}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleJoin} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Project"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
