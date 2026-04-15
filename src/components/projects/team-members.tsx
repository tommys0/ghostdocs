"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Clock, UserPlus } from "lucide-react";
import { getRoleLabel } from "@/lib/roles";
import { InviteMemberDialog } from "./invite-member-dialog";

interface TeamMember {
  id: string;
  role: "owner" | "manager" | "member";
  user: {
    id: string;
    name: string | null;
    email: string;
    github_username: string | null;
    avatar_url: string | null;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: "manager" | "member";
  created_at: string;
}

interface TeamMembersProps {
  projectId: string;
  projectName: string;
  members: TeamMember[];
  pendingInvitations: PendingInvitation[];
  canManage: boolean;
  currentUserId: string;
}

export function TeamMembers({
  projectId,
  projectName,
  members,
  pendingInvitations,
  canManage,
  currentUserId,
}: TeamMembersProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      router.refresh();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return;

    setRemovingId(memberId);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success(`${memberName} has been removed`);
      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""}
            {pendingInvitations.length > 0 && ` · ${pendingInvitations.length} pending`}
          </CardDescription>
        </div>
        {canManage && (
          <InviteMemberDialog projectId={projectId} projectName={projectName} />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Members */}
        <div className="space-y-3">
          {members.map((member) => {
            const user = Array.isArray(member.user) ? member.user[0] : member.user;
            if (!user) return null;

            const isCurrentUser = user.id === currentUserId;
            const isOwner = member.role === "owner";
            const canRemove = canManage && !isCurrentUser && !isOwner;

            const initials = user.name
              ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
              : user.email[0].toUpperCase();

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={
                        user.avatar_url ||
                        (user.github_username
                          ? `https://github.com/${user.github_username}.png`
                          : undefined)
                      }
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {user.name || user.email}
                        {isCurrentUser && (
                          <span className="ml-1 text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(member.role)}
                      </Badge>
                    </div>
                    {user.github_username && (
                      <p className="text-xs text-muted-foreground">
                        @{user.github_username}
                      </p>
                    )}
                  </div>
                </div>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id, user.name || user.email)}
                    disabled={removingId === member.id}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && canManage && (
          <>
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Pending Invitations
              </p>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between rounded-lg border border-dashed p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited as {getRoleLabel(invitation.role)} ·{" "}
                          {new Date(invitation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={cancellingId === invitation.id}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
