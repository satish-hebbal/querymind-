import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encrypt";
import { testConnection } from "@/lib/project-db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/** Tests an existing project's saved connection, or an updated URL not yet saved. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const overrideUrl = typeof (body as { dbUrl?: unknown }).dbUrl === "string" ? (body as { dbUrl: string }).dbUrl.trim() : "";

  let dbUrl = overrideUrl;

  if (!dbUrl) {
    const { data, error } = await supabase.from("projects").select("db_url").eq("id", params.id).single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    try {
      dbUrl = decrypt(data.db_url as string);
    } catch {
      return NextResponse.json({ success: false, error: "Stored connection could not be decrypted." });
    }
  }

  const result = await testConnection(dbUrl);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error });
  }

  return NextResponse.json({ success: true });
}
