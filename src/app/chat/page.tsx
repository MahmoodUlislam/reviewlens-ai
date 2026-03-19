"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";
import { ReviewMetadata } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReviewMetadata | null>(null);

  useEffect(() => {
    const sid = sessionStorage.getItem("reviewlens_session");
    const meta = sessionStorage.getItem("reviewlens_metadata");

    if (!sid || !meta) {
      router.push("/");
      return;
    }

    setSessionId(sid);
    try {
      setMetadata(JSON.parse(meta));
    } catch {
      router.push("/");
    }
  }, [router]);

  if (!sessionId || !metadata) {
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
        <ChatInterface sessionId={sessionId} metadata={metadata} />
      </main>
    </>
  );
}
