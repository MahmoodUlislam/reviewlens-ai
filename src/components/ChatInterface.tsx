"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
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

export default function ChatInterface({ sessionId, metadata }: ChatInterfaceProps) {
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

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, history }),
      });

      if (!response.ok) throw new Error("Chat request failed");

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
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + data.content } : m
                )
              );
            } else if (data.type === "guard") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.content, scopeGuardTriggered: true, guardrailAction: data.action }
                    : m
                )
              );
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: data.content } : m
                )
              );
            }
          } catch {
            /* skip invalid JSON */
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, something went wrong. Please try again." }
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
      <div className="glass-card rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">
            Guardrailed Q&A — {metadata.productName}
          </p>
          <p className="text-xs text-white/35">
            {metadata.totalReviews} {metadata.platform} reviews &middot; Dual-layer scope guard active
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-5 border border-violet-500/10">
                <Bot className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">
                Ask about the reviews
              </h3>
              <p className="text-sm text-white/35 mb-8 max-w-md mx-auto">
                I can analyze the {metadata.totalReviews} ingested {metadata.platform} reviews for{" "}
                <strong className="text-white/60">{metadata.productName}</strong>. I&apos;m scoped exclusively to this data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3.5 py-2 rounded-full glass hover:bg-violet-500/10 hover:border-violet-500/20 transition-all duration-200 text-white/50 hover:text-violet-300"
                  >
                    <Sparkles className="w-3 h-3 inline mr-1.5 text-violet-400" />
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
                "flex gap-3 animate-fade-up",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.scopeGuardTriggered
                      ? "bg-red-500/20 border border-red-500/20"
                      : "bg-violet-500/20 border border-violet-500/20"
                  )}
                >
                  {msg.scopeGuardTriggered ? (
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                  ) : (
                    <Bot className="w-4 h-4 text-violet-400" />
                  )}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/15"
                    : msg.scopeGuardTriggered
                    ? "glass border-red-500/20 bg-red-500/5 glow-red"
                    : "glass"
                )}
              >
                {msg.scopeGuardTriggered && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldAlert className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                      Scope Guard — Out of Scope
                    </span>
                  </div>
                )}
                <div className={cn(
                  "text-sm whitespace-pre-wrap leading-relaxed",
                  msg.role === "user" ? "text-white" : "text-white/70"
                )}>
                  {msg.content ||
                    (isStreaming && msg.role === "assistant" ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse delay-100" />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse delay-200" />
                      </div>
                    ) : null)}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="glass-card rounded-xl p-3 mt-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the reviews..."
            rows={2}
            disabled={isStreaming}
            className="resize-none bg-transparent border-none text-white/80 placeholder:text-white/20 focus:ring-0 focus-visible:ring-0"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="gradient-btn text-white px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center self-end"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2 text-center">
          Powered by Amazon Bedrock &middot; Guardrailed with Bedrock Guardrails + System Prompt
        </p>
      </div>
    </div>
  );
}
