import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request's cookies. In Server
 * Components `cookies()` is read-only, so `set`/`remove` are wrapped in
 * try/catch — the middleware is responsible for refreshing session cookies
 * in that case.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component - middleware refreshes the session instead.
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Called from a Server Component - middleware refreshes the session instead.
        }
      },
    },
  });
}
