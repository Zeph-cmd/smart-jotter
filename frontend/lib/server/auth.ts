import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/server/errors";

export async function requireAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw new ApiError("Authentication failed. Please sign in again.", 401);
  }

  if (!user) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  return {
    supabase,
    user
  };
}

export function requireUserId(user: User) {
  if (!user.id) {
    throw new ApiError("User account is missing an id.", 401);
  }

  return user.id;
}
