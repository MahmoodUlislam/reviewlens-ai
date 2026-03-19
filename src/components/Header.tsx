"use client";

import { Search, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Ingest", icon: Search },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Review<span className="gradient-text">Lens</span>
              <span className="text-violet-400/70 ml-0.5 text-sm font-medium">AI</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
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
