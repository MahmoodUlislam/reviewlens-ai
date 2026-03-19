import { NextRequest } from "next/server";
import { getSession } from "@/lib/store";
import { buildSystemPrompt } from "@/lib/prompts";
import { streamBedrockResponse } from "@/lib/bedrock";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, history = [] } = await request.json();

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: "sessionId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const session = getSession(sessionId);

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

    // Build conversation messages (include history for context)
    const messages = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Stream response using Bedrock with Guardrails
    const guardrailId = process.env.BEDROCK_GUARDRAIL_ID;
    const guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION || "DRAFT";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamBedrockResponse({
            systemPrompt,
            messages,
            guardrailId,
            guardrailVersion,
          });

          for await (const chunk of generator) {
            if (chunk.type === "text") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk.text })}\n\n`
                )
              );
            } else if (chunk.type === "guard") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "guard", action: chunk.action, content: chunk.message })}\n\n`
                )
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (error) {
          console.error("Bedrock streaming error:", error);

          // Check if it's a guardrail intervention (Bedrock throws on blocked)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes("guardrail") ||
            errorMessage.includes("GUARDRAIL")
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "guard",
                  action: "BLOCKED",
                  content: `I can only analyze the ${session.metadata.totalReviews} ${session.metadata.platform} reviews loaded for **${session.metadata.productName}**. That question falls outside the scope of the ingested review data. Feel free to ask me anything about the reviews!`,
                })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  content: "An error occurred while generating a response. Please try again.",
                })}\n\n`
              )
            );
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
