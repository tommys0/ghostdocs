import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const user = data.session.user;
      const providerToken = data.session.provider_token;

      if (user) {
        // Find GitHub identity from the identities array (for linked accounts)
        const githubIdentity = user.identities?.find(
          (identity) => identity.provider === "github"
        );
        const identityData = githubIdentity?.identity_data;

        // Get GitHub info - check both identity_data (linked) and user_metadata (direct signup)
        const githubData = {
          github_access_token: providerToken || null,
          github_id: identityData?.provider_id || user.user_metadata?.provider_id || null,
          github_username: identityData?.user_name || user.user_metadata?.user_name || null,
          avatar_url: identityData?.avatar_url || user.user_metadata?.avatar_url || null,
          name: identityData?.name || identityData?.full_name || user.user_metadata?.name || user.user_metadata?.full_name || null,
        };

        // Update the user record with GitHub info
        const { error: updateError } = await supabase
          .from("users")
          .update(githubData)
          .eq("id", user.id);

        // If user doesn't exist yet (shouldn't happen with email signup, but just in case)
        if (updateError?.code === "PGRST116") {
          await supabase.from("users").insert({
            id: user.id,
            email: user.email || "",
            ...githubData,
          });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
