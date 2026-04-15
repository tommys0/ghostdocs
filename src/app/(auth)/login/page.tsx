import Link from "next/link";
import { GitBranch } from "lucide-react";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { next } = await searchParams;
  const signupUrl = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold"
        >
          <GitBranch className="h-8 w-8" />
          <span>GhostDoc</span>
        </Link>

        {/* Login Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailAuthForm mode="login" />
            <ErrorMessage searchParams={searchParams} />
          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={signupUrl} className="font-medium text-foreground underline hover:text-foreground/80">
            Sign up
          </Link>
        </p>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  if (!params.error) return null;

  return (
    <p className="mt-4 text-center text-sm text-destructive">
      {params.error === "auth_callback_error"
        ? "Authentication failed. Please try again."
        : "An error occurred. Please try again."}
    </p>
  );
}
