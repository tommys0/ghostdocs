"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Link2, Loader2 } from "lucide-react";

interface TeamInviteLinkProps {
  projectId: string;
}

export function TeamInviteLink({ projectId }: TeamInviteLinkProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<{
    token: string | null;
    role: "manager" | "member" | "viewer";
    enabled: boolean;
  }>({
    token: null,
    role: "member",
    enabled: false,
  });

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/team-invite`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          token: data.token,
          role: data.role || "member",
          enabled: data.enabled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching team invite settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/team-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: settings.role }),
      });

      if (!res.ok) throw new Error("Failed to generate link");

      const data = await res.json();
      setSettings({
        token: data.token,
        role: data.role,
        enabled: true,
      });
      toast.success("Team invite link generated!");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate invite link");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/team-invite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) throw new Error("Failed to update settings");

      setSettings((prev) => ({ ...prev, enabled }));
      toast.success(enabled ? "Invite link enabled" : "Invite link disabled");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (role: "manager" | "member" | "viewer") => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/team-invite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      setSettings((prev) => ({ ...prev, role }));
      toast.success("Default role updated");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!settings.token) return;
    const link = `${window.location.origin}/join/${settings.token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = settings.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${settings.token}`
    : "";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <CardTitle>Team Invite Link</CardTitle>
        </div>
        <CardDescription>
          Share this link with your team to let anyone join without individual invitations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.token ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              No team invite link created yet
            </p>
            <Button onClick={handleGenerateLink} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Generate Invite Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="invite-enabled">Link enabled</Label>
              <Switch
                id="invite-enabled"
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="font-mono text-sm"
                  disabled={!settings.enabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!settings.enabled}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateLink}
                  disabled={isSaving}
                  title="Generate new link (invalidates old one)"
                >
                  <RefreshCw className={`h-4 w-4 ${isSaving ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can join the project
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default role for new members</Label>
              <Select
                value={settings.role}
                onValueChange={(v) => handleChangeRole(v as "manager" | "member")}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Engineer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
