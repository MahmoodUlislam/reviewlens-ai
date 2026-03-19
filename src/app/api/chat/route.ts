import { NextRequest } from "next/server";
import { getSession, setSession } from "@/lib/store";
import { buildSystemPrompt } from "@/lib/prompts";
import { streamBedrockResponse } from "@/lib/bedrock";
import { ReviewSession } from "@/types";

export const dynamic = "force-dynamic";

// Convert async generator to a ReadableStream using the pull pattern
// (recommended by Next.js docs for proper chunk-by-chunk streaming)
function iteratorToStream(
  iterator: AsyncGenerator<Uint8Array, void, unknown>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, history = [], sessionData } =
      await request.json();

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "sessionId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try in-memory store first; if missing, hydrate from client-provided sessionData
    let session = getSession(sessionId);

    if (!session && sessionData) {
      const restored: ReviewSession = {
        sessionId,
        reviews: sessionData.reviews,
        metadata: sessionData.metadata,
        analytics: sessionData.analytics,
      };
      setSession(sessionId, restored);
      session = restored;
    }

    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Session not found. Please ingest reviews first.",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with review context
    const systemPrompt = buildSystemPrompt(session.metadata, session.reviews);

    // Sanitize history: only allow valid roles and string content
    const MAX_HISTORY_MESSAGES = 50;
    const MAX_MESSAGE_LENGTH = 10_000;

    const sanitizedHistory = (Array.isArray(history) ? history : [])
      .slice(-MAX_HISTORY_MESSAGES)
      .filter(
        (h: unknown): h is { role: string; content: string } =>
          typeof h === "object" &&
          h !== null &&
          typeof (h as Record<string, unknown>).role === "string" &&
          typeof (h as Record<string, unknown>).content === "string" &&
          ["user", "assistant"].includes((h as Record<string, unknown>).role as string)
      )
      .map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content.slice(0, MAX_MESSAGE_LENGTH),
      }));

    // Build conversation messages (include history for context)
    const messages = [
      ...sanitizedHistory,
      { role: "user" as const, content: message.slice(0, MAX_MESSAGE_LENGTH) },
    ];

    // Stream response using Bedrock with Guardrails
    const guardrailId = process.env.BEDROCK_GUARDRAIL_ID;
    const guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION || "DRAFT";

    const encoder = new TextEncoder();
    const confirmedSession = session;

    // Async generator that yields SSE-encoded chunks
    async function* makeSSEIterator(): AsyncGenerator<
      Uint8Array,
      void,
      unknown
    > {
      try {
        const generator = streamBedrockResponse({
          systemPrompt,
          messages,
          guardrailId,
          guardrailVersion,
        });

        for await (const chunk of generator) {
          if (chunk.type === "text") {
            yield encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: chunk.text })}\n\n`
            );
          } else if (chunk.type === "guard") {
            yield encoder.encode(
              `data: ${JSON.stringify({ type: "guard", action: chunk.action, content: chunk.message })}\n\n`
            );
          }
        }

        yield encoder.encode(
          `data: ${JSON.stringify({ type: "done" })}\n\n`
        );
      } catch (error) {
        console.error("Bedrock streaming error:", error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("guardrail") ||
          errorMessage.includes("GUARDRAIL")
        ) {
          yield encoder.encode(
            `data: ${JSON.stringify({
              type: "guard",
              action: "BLOCKED",
              content: `I can only analyze the ${confirmedSession.metadata.totalReviews} ${confirmedSession.metadata.platform} reviews loaded for **${confirmedSession.metadata.productName}**. That question falls outside the scope of the ingested review data. Feel free to ask me anything about the reviews!`,
            })}\n\n`
          );
        } else {
          yield encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              content:
                "An error occurred while generating a response. Please try again.",
            })}\n\n`
          );
        }

        yield encoder.encode(
          `data: ${JSON.stringify({ type: "done" })}\n\n`
        );
      }
    }

    const stream = iteratorToStream(makeSSEIterator());

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
