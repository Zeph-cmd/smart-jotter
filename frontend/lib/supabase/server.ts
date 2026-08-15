import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const authHeader = headerList.get("Authorization");

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: authHeader ? { Authorization: authHeader } : undefined,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers can write cookies. Server components may no-op here.
        }
      }
    }
  });
}
