import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/project-db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Tests a not-yet-saved DB connection string, e.g. from the New Project modal. */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dbUrl = typeof (body as { dbUrl?: unknown }).dbUrl === "string" ? (body as { dbUrl: string }).dbUrl.trim() : "";

  if (!dbUrl) {
    return NextResponse.json({ error: "A database connection URL is required." }, { status: 400 });
  }

  const result = await testConnection(dbUrl);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ success: true });
}
