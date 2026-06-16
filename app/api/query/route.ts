import { NextRequest, NextResponse } from "next/server";
import { CANNOT_ANSWER, generateSQL, generateSuggestions, generateSummary, validateSql } from "@/lib/ai";
import { describeAiError, describeDbError, validateConnectionString } from "@/lib/db-errors";
import { decrypt } from "@/lib/encrypt";
import { queryProjectDb } from "@/lib/project-db";
import { getProjectSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import type { AiProvider, QueryApiError, QueryApiResponse, ResultRow } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json<QueryApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json<QueryApiError>({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const projectId = typeof input.projectId === "string" ? input.projectId : "";
  const question = typeof input.question === "string" ? input.question.trim() : "";

  if (!projectId) {
    return NextResponse.json<QueryApiError>({ error: "A 'projectId' is required." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json<QueryApiError>({ error: "A non-empty 'question' string is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("db_url, ai_provider, ai_api_key, ai_base_url, ai_model")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json<QueryApiError>({ error: "Project not found." }, { status: 404 });
  }

  let sql = "";
  let dbUrl = "";

  try {
    dbUrl = decrypt(project.db_url as string);
    const aiProvider = project.ai_provider as AiProvider;
    const aiApiKey = project.ai_api_key ? decrypt(project.ai_api_key as string) : null;
    const aiBaseUrl = project.ai_base_url as string | null;
    const aiModel = project.ai_model as string | null;

    const formatError = validateConnectionString(dbUrl);
    if (formatError) {
      return NextResponse.json<QueryApiError>(
        { error: `This project's database connection looks wrong: ${formatError} You can fix it on the Config page.`, errorKind: "hard" },
        { status: 422 }
      );
    }

    const schema = await getProjectSchema(projectId, dbUrl);

    try {
      sql = await generateSQL(question, schema, aiProvider, aiApiKey, aiBaseUrl, aiModel);
    } catch (aiError) {
      return NextResponse.json<QueryApiError>(
        { error: `Couldn't generate a query: ${describeAiError(aiError, aiProvider)}`, errorKind: "hard" },
        { status: 502 }
      );
    }

    if (sql.trim().toUpperCase() === CANNOT_ANSWER) {
      const suggestions = await generateSuggestions(question, schema, aiProvider, aiApiKey, aiBaseUrl, aiModel);
      return NextResponse.json<QueryApiError>(
        { error: "That can't be answered from the available data.", errorKind: "soft", suggestions },
        { status: 422 }
      );
    }

    const validation = validateSql(sql);
    if (!validation.valid) {
      return NextResponse.json<QueryApiError>(
        { error: `The generated query was rejected: ${validation.reason}`, sql, errorKind: "hard" },
        { status: 422 }
      );
    }

    const result = await queryProjectDb<ResultRow>(dbUrl, sql);

    let summary: string | undefined;
    try {
      summary = await generateSummary(question, result.columns, result.rows, result.rowCount, aiProvider, aiApiKey, aiBaseUrl, aiModel);
    } catch (error) {
      console.error("Summary generation error:", error);
    }

    const { data: chat } = await supabase
      .from("chats")
      .insert({
        project_id: projectId,
        user_id: userData.user.id,
        question,
        sql_generated: sql,
        result_json: {
          sql,
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount,
          summary,
        },
      })
      .select("id")
      .single();

    return NextResponse.json<QueryApiResponse>({
      sql,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      summary,
      chatId: chat?.id as string | undefined,
    });
  } catch (error) {
    console.error("Query API error:", error);

    return NextResponse.json<QueryApiError>(
      { error: `Couldn't run that query: ${describeDbError(error, dbUrl)}`, sql: sql || undefined, errorKind: "hard" },
      { status: 500 }
    );
  }
}
