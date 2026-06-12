import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CANNOT_ANSWER, generateSql, generateSummary, validateSql } from "@/lib/gemini";
import { getSchema } from "@/lib/schema";
import type { QueryApiError, QueryApiResponse, ResultRow } from "@/types";

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json<QueryApiError>({ error: "Invalid JSON body." }, { status: 400 });
  }

  const question =
    typeof body === "object" && body !== null && "question" in body && typeof (body as { question: unknown }).question === "string"
      ? (body as { question: string }).question.trim()
      : "";

  if (!question) {
    return NextResponse.json<QueryApiError>({ error: "A non-empty 'question' string is required." }, { status: 400 });
  }

  let sql = "";

  try {
    const schema = await getSchema();
    sql = await generateSql(schema, question);

    if (sql.trim().toUpperCase() === CANNOT_ANSWER) {
      return NextResponse.json<QueryApiError>(
        { error: "That can't be answered from the available data. Try rephrasing your question." },
        { status: 422 }
      );
    }

    const validation = validateSql(sql);
    if (!validation.valid) {
      return NextResponse.json<QueryApiError>(
        { error: `The generated query was rejected: ${validation.reason}`, sql },
        { status: 422 }
      );
    }

    const result = await query<ResultRow>(sql);

    let summary: string | undefined;
    try {
      summary = await generateSummary(question, result.columns, result.rows, result.rowCount);
    } catch (error) {
      console.error("Summary generation error:", error);
    }

    return NextResponse.json<QueryApiResponse>({
      sql,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      summary,
    });
  } catch (error) {
    console.error("Query API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json<QueryApiError>(
      { error: `Something went wrong while running your query: ${message}`, sql: sql || undefined },
      { status: 500 }
    );
  }
}
