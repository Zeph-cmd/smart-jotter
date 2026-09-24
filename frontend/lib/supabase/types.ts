import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lenient alias for the Supabase browser/server client used across the app.
 *
 * Smart Jotter tables live in the "jotter" schema of the shared Supabase
 * project (see lib/supabase/browser.ts). supabase-js v2 bakes the schema name
 * into the client's generic type, which makes a "jotter"-schema client
 * structurally incompatible with a "public"-schema client even though every
 * runtime call is identical. Generic parameters are therefore widened to
 * `any` so clients created with either schema are assignable to this alias.
 */
export type AppSupabaseClient = SupabaseClient<any, any, any, any, any>;
