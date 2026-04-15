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

interface SignupPageProps {
  searchParams: Promise<{ next?: string; email?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next, email } = await searchParams;
  const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

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

        {/* Signup Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Get started with GhostDoc for free
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailAuthForm mode="signup" />
          </CardContent>
        </Card>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginUrl} className="font-medium text-foreground underline hover:text-foreground/80">
            Sign in
          </Link>
        </p>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
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
