import { NextRequest, NextResponse } from "next/server";
import { describeDbError, validateConnectionString } from "@/lib/db-errors";
import { decrypt } from "@/lib/encrypt";
import { getProjectSchemaStructured } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { projectId: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("projects").select("db_url").eq("id", params.projectId).single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const dbUrl = decrypt(data.db_url as string);

    const formatError = validateConnectionString(dbUrl);
    if (formatError) {
      return NextResponse.json({ error: `This project's database connection looks wrong: ${formatError}` }, { status: 422 });
    }

    const schema = await getProjectSchemaStructured(params.projectId, dbUrl);
    return NextResponse.json(schema);
  } catch (err) {
    return NextResponse.json({ error: `Couldn't load the schema: ${describeDbError(err)}` }, { status: 500 });
  }
}
