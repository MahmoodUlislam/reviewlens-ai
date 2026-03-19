"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  Shield,
  ShieldAlert,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { ChatMessage, ReviewMetadata } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  sessionId: string;
  metadata: ReviewMetadata;
}

const SUGGESTED_QUESTIONS = [
  "What are the most common complaints?",
  "Summarize the positive reviews",
  "What do customers say about quality?",
  "Are there any recurring issues?",
  "What features do reviewers mention most?",
  "Compare 5-star vs 1-star review themes",
];

export default function ChatInterface({
  sessionId,
  metadata,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create placeholder assistant message
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Build history (exclude the new user message and empty assistant)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, history }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m
                )
              );
            } else if (data.type === "guard") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: data.content,
                        scopeGuardTriggered: true,
                        guardrailAction: data.action,
                      }
                    : m
                )
              );
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.content }
                    : m
                )
              );
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, something went wrong. Please try again.",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Chat header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <Shield className="w-5 h-5 text-green-500" />
        <div>
          <p className="text-sm font-medium">
            Guardrailed Q&A — {metadata.productName}
          </p>
          <p className="text-xs text-muted-foreground">
            {metadata.totalReviews} {metadata.platform} reviews loaded •
            Dual-layer scope guard active
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Ask about the reviews
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                I can analyze the {metadata.totalReviews} ingested{" "}
                {metadata.platform} reviews for{" "}
                <strong>{metadata.productName}</strong>. I&apos;m scoped
                exclusively to this data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors text-left"
                  >
                    <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.scopeGuardTriggered
                      ? "bg-destructive/10"
                      : "bg-primary/10"
                  )}
                >
                  {msg.scopeGuardTriggered ? (
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
              )}

              <Card
                className={cn(
                  "max-w-[80%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.scopeGuardTriggered
                    ? "border-destructive/30 bg-destructive/5"
                    : ""
                )}
              >
                <CardContent className="p-3">
                  {msg.scopeGuardTriggered && (
                    <Badge
                      variant="destructive"
                      className="mb-2 text-xs"
                    >
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Scope Guard — Out of Scope
                    </Badge>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content ||
                      (isStreaming && msg.role === "assistant" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null)}
                  </div>
                </CardContent>
              </Card>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t pt-4 mt-2">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the reviews..."
            rows={2}
            disabled={isStreaming}
            className="resize-none"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-auto"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by Amazon Bedrock • Guardrailed with Bedrock Guardrails +
          System Prompt
        </p>
      </div>
    </div>
  );
}
