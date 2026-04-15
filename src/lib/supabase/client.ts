import { createBrowserClient } from "@supabase/ssr";

// Note: Once you run the migration and generate types with Supabase CLI,
// you can add type safety by importing Database from @/types/database
// and using createBrowserClient<Database>(...)

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
