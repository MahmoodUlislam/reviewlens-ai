"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";
import { ReviewMetadata } from "@/types";

interface SessionData {
  sessionId: string;
  metadata: ReviewMetadata;
}

export default function ChatPage() {
  const router = useRouter();
  const [data] = useState<SessionData | null>(() => {
    if (typeof window === "undefined") return null;
    const sid = sessionStorage.getItem("reviewlens_session");
    const meta = sessionStorage.getItem("reviewlens_metadata");
    if (!sid || !meta) return null;
    try {
      return { sessionId: sid, metadata: JSON.parse(meta) };
    } catch {
      return null;
    }
  });

  // Redirect if no session data (effect only handles navigation, no setState)
  useEffect(() => {
    if (!data) router.push("/");
  }, [data, router]);

  if (!data) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ChatInterface sessionId={data.sessionId} metadata={data.metadata} />
      </main>
    </>
  );
}
