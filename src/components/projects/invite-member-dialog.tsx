"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2, Copy, Check } from "lucide-react";

interface InviteMemberDialogProps {
  projectId: string;
  projectName: string;
}

export function InviteMemberDialog({ projectId, projectName }: InviteMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink(null);
    setEmail("");
    setRole("member");
    setCopied(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      // Create invitation via API
      const createRes = await fetch("/api/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          email: email.toLowerCase(),
          role,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        toast.error(createData.error || "Failed to create invitation");
        setIsLoading(false);
        return;
      }

      // Build the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/invite/${createData.invitation.token}`;
      setInviteLink(link);

      toast.success("Invitation created!");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { message?: string })?.message || "Unknown error";
      console.error("Error sending invitation:", errorMessage, error);
      toast.error(errorMessage || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
        <UserPlus className="h-4 w-4" />
        Invite Member
      </DialogTrigger>
      <DialogContent>
        {inviteLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation Created</DialogTitle>
              <DialogDescription>
                Share this link with {email} to invite them to {projectName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite someone to join {projectName}. They&apos;ll receive access once they sign up or log in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "manager" | "member")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[300px]">
                    <SelectItem value="member">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Engineer</span>
                        <span className="text-xs text-muted-foreground">Can view personal activity</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Manager</span>
                        <span className="text-xs text-muted-foreground">Can view team activity & reports</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Invitation"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
