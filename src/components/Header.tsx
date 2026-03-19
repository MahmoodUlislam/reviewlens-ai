"use client";

import { useEffect, useState } from "react";
import { Search, BarChart3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(!!sessionStorage.getItem("reviewlens_session"));
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Ingest", icon: Search, alwaysEnabled: true },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3, alwaysEnabled: false },
  ];

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.svg"
              alt="ReviewLens AI"
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-violet-500/25"
              priority
            />
            <span className="text-xl font-bold tracking-tight">
              Review<span className="gradient-text">Lens</span>
              <span className="text-violet-400/70 ml-0.5 text-sm font-medium">AI</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isDisabled = !item.alwaysEnabled && !hasSession;

              if (isDisabled) {
                return (
                  <span
                    key={item.href}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-white/20 cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 border border-violet-500/20 shadow-lg shadow-violet-500/10"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
