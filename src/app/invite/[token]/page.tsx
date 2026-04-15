import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AcceptInvitation } from "./accept-invitation";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get invitation details (use admin client to bypass RLS - token acts as auth)
  const { data: invitation } = await supabaseAdmin
    .from("project_invitations")
    .select("*, project:projects(name)")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          <p className="mt-2 text-muted-foreground">
            This invitation link is invalid or has already been used.
          </p>
        </div>
      </div>
    );
  }

  const projectName = Array.isArray(invitation.project)
    ? invitation.project[0]?.name
    : invitation.project?.name;

  // If not logged in, redirect to signup with return URL
  if (!user) {
    const returnUrl = `/invite/${token}`;
    redirect(`/signup?next=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(invitation.email)}`);
  }

  // If logged in with different email, show message
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">Wrong Account</h1>
          <p className="mt-2 text-muted-foreground">
            This invitation was sent to <strong>{invitation.email}</strong>, but
            you&apos;re logged in as <strong>{user.email}</strong>.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Please log out and sign in with the correct email address to accept
            this invitation.
          </p>
        </div>
      </div>
    );
  }

  // Show accept invitation UI
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AcceptInvitation
        token={token}
        projectName={projectName || "the project"}
        role={invitation.role}
      />
    </div>
  );
}
