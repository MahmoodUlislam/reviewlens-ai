import Header from "@/components/Header";
import IngestForm from "@/components/IngestForm";
import { Shield, BarChart3, MessageSquare, Zap } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Review Intelligence,
              <br />
              <span className="text-primary/70">Guardrailed by AI</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ingest product reviews from any platform, analyze sentiment and
              trends, and interrogate the data through a scope-guarded AI
              assistant that never drifts off-topic.
            </p>
          </div>

          <IngestForm />

          {/* Features grid */}
          <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Ingestion",
                desc: "Scrape reviews from Amazon or upload CSV data in seconds",
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                desc: "Rating distribution, sentiment analysis powered by AWS Comprehend",
              },
              {
                icon: MessageSquare,
                title: "AI Q&A",
                desc: "Ask questions about reviews with cited, data-backed answers",
              },
              {
                icon: Shield,
                title: "Dual Scope Guard",
                desc: "Bedrock Guardrails + system prompt — never drifts off-topic",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-6 text-center text-xs text-muted-foreground">
          <p>
            Built with Next.js, Amazon Bedrock, Bedrock Guardrails &amp; Amazon
            Comprehend
          </p>
        </footer>
      </main>
    </>
  );
}
