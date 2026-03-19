"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  Shield,
  ShieldAlert,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, ReviewMetadata } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  sessionId: string;
  metadata: ReviewMetadata;
  compact?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What are the most common complaints?",
  "Summarize the positive reviews",
  "What do customers say about quality?",
  "Are there any recurring issues?",
  "What features do reviewers mention most?",
  "Compare 5-star vs 1-star review themes",
];

export default function ChatInterface({ sessionId, metadata, compact }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll on every message update (including streaming chunks)
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Capture current messages for history BEFORE updating state
    const currentMessages = [...messages];

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
      const history = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Always send session data so the server can rehydrate if its
      // in-memory store was cleared (deploy, worker recycle, TTL expiry)
      let sessionData: Record<string, unknown> | undefined;
      try {
        const reviews = JSON.parse(sessionStorage.getItem("reviewlens_reviews") || "[]");
        const meta = JSON.parse(sessionStorage.getItem("reviewlens_metadata") || "{}");
        const analytics = JSON.parse(sessionStorage.getItem("reviewlens_analytics") || "{}");
        if (reviews.length > 0) {
          sessionData = { reviews, metadata: meta, analytics };
        }
      } catch { /* proceed without */ }

      // Abort any previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "identity",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ sessionId, message: text, history, sessionData }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (line.startsWith("data: ")) {
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

          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      // Don't show error for intentional aborts (unmount, navigation)
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
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
    <div className={cn("flex flex-col", compact ? "h-full" : "h-[calc(100vh-10rem)]")}>
      {/* Chat header — hidden in compact/drawer mode */}
      {!compact && (
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
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className={cn("text-center animate-fade-in", compact ? "py-8" : "py-16")}>
              <div className={cn(
                "rounded-2xl bg-linear-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto border border-violet-500/10",
                compact ? "w-12 h-12 mb-3" : "w-16 h-16 mb-5"
              )}>
                <Bot className={cn(compact ? "w-6 h-6" : "w-8 h-8", "text-violet-400")} />
              </div>
              <h3 className={cn("font-semibold text-white/80 mb-2", compact ? "text-base" : "text-lg")}>
                Ask about the reviews
              </h3>
              <p className={cn("text-sm text-white/35 max-w-md mx-auto", compact ? "mb-5" : "mb-8")}>
                I can analyze the {metadata.totalReviews} ingested {metadata.platform} reviews for{" "}
                <strong className="text-white/60">{metadata.productName}</strong>. I&apos;m scoped exclusively to this data.
              </p>
              <div className={cn("flex flex-wrap gap-2 justify-center", compact ? "max-w-sm" : "max-w-lg", "mx-auto")}>
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
                  "text-sm leading-relaxed",
                  msg.role === "user" ? "text-white whitespace-pre-wrap" : "text-white/70"
                )}>
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <>
                        <div className="chat-markdown">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                          <div className="flex items-center justify-end gap-1 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                          </div>
                        )}
                      </>
                    ) : (
                      msg.content
                    )
                  ) : (
                    isStreaming && msg.role === "assistant" ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        <span className="text-xs text-violet-300/70 animate-pulse">Analyzing reviews...</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
            </div>
          ))}
          {/* Invisible anchor for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="glass-card rounded-xl p-3 mt-3 shrink-0">
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
