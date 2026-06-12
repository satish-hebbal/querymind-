import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
