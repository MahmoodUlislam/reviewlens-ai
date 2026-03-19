"use client";

import { useEffect } from "react";
import { X, Shield } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import { ReviewMetadata } from "@/types";
import { cn } from "@/lib/utils";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  metadata: ReviewMetadata;
}

export default function ChatDrawer({ open, onClose, sessionId, metadata }: ChatDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[85vw] lg:w-[75vw] xl:w-[65vw] z-50 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full flex flex-col bg-[#0a0a1a]/95 backdrop-blur-xl border-l border-white/[0.06] shadow-2xl">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Guardrailed Q&A
                </p>
                <p className="text-[11px] text-white/35">
                  {metadata.totalReviews} reviews &middot; Scope guard active
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 min-h-0 overflow-hidden px-3 pt-3 pb-3">
            <ChatInterface sessionId={sessionId} metadata={metadata} compact />
          </div>
        </div>
      </div>
    </>
  );
}
