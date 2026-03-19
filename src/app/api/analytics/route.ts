import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: "Session not found. Please ingest reviews first." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    analytics: session.analytics,
    metadata: session.metadata,
  });
}
