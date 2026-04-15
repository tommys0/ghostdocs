"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailAuthFormProps {
  mode: "login" | "signup";
}

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Pre-fill email from invite link
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam && mode === "signup") {
      setEmail(emailParam);
    }
  }, [searchParams, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        // Include next param in callback URL so user is redirected after confirmation
        const next = searchParams.get("next");
        const callbackUrl = next
          ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`
          : `${window.location.origin}/api/auth/callback`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
            emailRedirectTo: callbackUrl,
          },
        });

        if (error) throw error;

        toast.success("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Redirect to next param if present, otherwise dashboard
        const next = searchParams.get("next");
        router.push(next || "/dashboard");
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? mode === "signup"
            ? "Creating account..."
            : "Signing in..."
          : mode === "signup"
          ? "Create account"
          : "Sign in"}
      </Button>
    </form>
  );
}
