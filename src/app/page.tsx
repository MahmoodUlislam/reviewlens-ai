import Header from "@/components/Header";
import IngestForm from "@/components/IngestForm";
import { Shield, BarChart3, MessageSquare, Zap } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative py-20 px-4 overflow-hidden">
          {/* Floating gradient orbs */}
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center mb-14 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-violet-300 mb-6 animate-fade-up">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Amazon Bedrock &middot; Comprehend &middot; Apify &middot; Next.js 16
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-up delay-100" style={{ animationFillMode: 'backwards' }}>
              Review Intelligence,
              <br />
              <span className="gradient-text">Guardrailed by AI</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed animate-fade-up delay-200" style={{ animationFillMode: 'backwards' }}>
              Ingest product reviews from any platform, analyze sentiment and
              trends, then interrogate the data through a scope-guarded AI
              assistant that never drifts off-topic.
            </p>
          </div>

          <div className="animate-fade-up delay-300" style={{ animationFillMode: 'backwards' }}>
            <IngestForm />
          </div>

          {/* Feature cards */}
          <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-400" style={{ animationFillMode: 'backwards' }}>
            {[
              {
                icon: Zap,
                title: "Instant Ingestion",
                desc: "Scrape Amazon reviews via Apify or upload CSV — with real overall rating from product page",
                glow: "glow-purple",
                iconBg: "from-violet-500 to-purple-600",
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                desc: "Rating distribution, keyword cloud, and NLP sentiment analysis powered by Amazon Comprehend",
                glow: "glow-blue",
                iconBg: "from-indigo-500 to-blue-600",
              },
              {
                icon: MessageSquare,
                title: "Streaming AI Q&A",
                desc: "Ask questions in a slide-out chat — streamed responses with markdown rendering and review citations",
                glow: "glow-cyan",
                iconBg: "from-cyan-500 to-teal-600",
              },
              {
                icon: Shield,
                title: "Dual Scope Guard",
                desc: "Bedrock Guardrails + system prompt enforce review-only scope — out-of-scope queries are blocked",
                glow: "glow-green",
                iconBg: "from-emerald-500 to-green-600",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`glass-card rounded-xl p-5 text-center group cursor-default`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl bg-linear-to-br ${feature.iconBg} flex items-center justify-center mx-auto mb-3.5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-white/90 mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-white/5 py-8 text-center space-y-1">
          <p className="text-xs text-white/30">
            Built with Next.js 16 &middot; Amazon Bedrock &middot; Bedrock Guardrails &middot; Amazon Comprehend
          </p>
          <p className="text-xs text-white/20">
            Powered by <span className="text-violet-400/60 font-medium">Mahmood</span>
          </p>
        </footer>
      </main>
    </>
  );
}
