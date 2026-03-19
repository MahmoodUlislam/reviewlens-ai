import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  type Message,
  type ContentBlock,
  type GuardrailConfiguration,
} from "@aws-sdk/client-bedrock-runtime";

// Uses default AWS credentials chain (profile, env vars, IAM role)
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-opus-4-6-v1";

interface BedrockStreamOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  guardrailId?: string;
  guardrailVersion?: string;
}

export async function* streamBedrockResponse(
  options: BedrockStreamOptions
): AsyncGenerator<
  { type: "text"; text: string } | { type: "guard"; action: string; message: string },
  void,
  unknown
> {
  const { systemPrompt, messages, guardrailId, guardrailVersion } = options;

  const bedrockMessages: Message[] = messages.map((m) => ({
    role: m.role,
    content: [{ text: m.content } as ContentBlock],
  }));

  const guardrailConfig: GuardrailConfiguration | undefined =
    guardrailId && guardrailVersion
      ? {
          guardrailIdentifier: guardrailId,
          guardrailVersion: guardrailVersion,
        }
      : undefined;

  const command = new ConverseStreamCommand({
    modelId: MODEL_ID,
    system: [{ text: systemPrompt }],
    messages: bedrockMessages,
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.3,
    },
    ...(guardrailConfig && { guardrailConfig: guardrailConfig }),
  });

  const response = await client.send(command);

  if (!response.stream) {
    throw new Error("No stream in Bedrock response");
  }

  for await (const event of response.stream) {
    if (event.contentBlockDelta?.delta?.text) {
      yield { type: "text", text: event.contentBlockDelta.delta.text };
    }

    // Check if guardrail intervened
    if (event.metadata?.trace?.guardrail?.inputAssessment) {
      const assessment = event.metadata.trace.guardrail.inputAssessment;
      const assessmentValues = Object.values(assessment);
      for (const a of assessmentValues) {
        if (a.topicPolicy?.topics) {
          for (const topic of a.topicPolicy.topics) {
            if (topic.action === "BLOCKED") {
              yield {
                type: "guard",
                action: "BLOCKED",
                message: `I can only analyze the reviews that have been loaded into this session. I'm not able to help with topics related to "${topic.name}". Feel free to ask me anything about the ingested reviews!`,
              };
              return;
            }
          }
        }
      }
    }

    if (event.metadata?.trace?.guardrail?.outputAssessments) {
      const assessments = event.metadata.trace.guardrail.outputAssessments;
      for (const assessmentList of Object.values(assessments)) {
        for (const a of assessmentList as Array<Record<string, unknown>>) {
          const topicPolicy = a.topicPolicy as { topics?: Array<{ action: string; name: string }> } | undefined;
          if (topicPolicy?.topics) {
            for (const topic of topicPolicy.topics) {
              if (topic.action === "BLOCKED") {
                yield {
                  type: "guard",
                  action: "BLOCKED",
                  message: `I can only analyze the reviews that have been loaded into this session. I'm not able to help with topics related to "${topic.name}". Feel free to ask me anything about the ingested reviews!`,
                };
                return;
              }
            }
          }
        }
      }
    }
  }
}
