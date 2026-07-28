import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  assertSupabasePublicEnv,
  supabaseCookieOptions,
  supabaseEnv,
} from "@/lib/supabase/config";

export const createSupabaseServerClient = async (_request?: Request) => {
  assertSupabasePublicEnv();

  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookieOptions: supabaseCookieOptions,
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
          // Server Components cannot always write cookies. The private-route
          // proxy refreshes sessions before protected pages and APIs run.
        }
      },
    },
  });
};

export const createSupabasePublicClient = () => {
  assertSupabasePublicEnv();

  return createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
