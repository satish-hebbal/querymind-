import { NextRequest, NextResponse } from "next/server";
import { describeDbError, validateConnectionString } from "@/lib/db-errors";
import { decrypt } from "@/lib/encrypt";
import { queryProjectDb } from "@/lib/project-db";
import { createClient } from "@/lib/supabase/server";
import type { TableInfo } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const table = req.nextUrl.searchParams.get("table") ?? "";

  if (!IDENTIFIER_PATTERN.test(table)) {
    return NextResponse.json({ error: "Invalid table name." }, { status: 400 });
  }

  const { data, error } = await supabase.from("projects").select("db_url").eq("id", params.id).single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const dbUrl = decrypt(data.db_url as string);

    const formatError = validateConnectionString(dbUrl);
    if (formatError) {
      return NextResponse.json({ error: `This project's database connection looks wrong: ${formatError}` }, { status: 422 });
    }

    const [countResult, sampleResult] = await Promise.all([
      queryProjectDb<{ count: string }>(dbUrl, `select count(*) from "${table}"`),
      queryProjectDb(dbUrl, `select * from "${table}" limit 5`),
    ]);

    const info: TableInfo = {
      rowCount: Number(countResult.rows[0]?.count ?? 0),
      columns: sampleResult.columns,
      sample: sampleResult.rows,
    };

    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json({ error: `Couldn't load table info: ${describeDbError(err)}` }, { status: 500 });
  }
}
