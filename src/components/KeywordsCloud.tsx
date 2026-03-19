"use client";

interface KeywordsCloudProps {
  keywords: { word: string; count: number }[];
}

export default function KeywordsCloud({ keywords }: KeywordsCloudProps) {
  if (keywords.length === 0) return null;

  const maxCount = keywords[0]?.count || 1;

  const getStyle = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return "text-sm font-bold text-violet-300 bg-violet-500/15 border-violet-500/20";
    if (ratio > 0.4) return "text-xs font-semibold text-indigo-300 bg-indigo-500/10 border-indigo-500/15";
    return "text-xs font-medium text-white/50 bg-white/5 border-white/10";
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Top Keywords</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <span
            key={kw.word}
            className={`px-3 py-1 rounded-full border cursor-default transition-all hover:scale-105 ${getStyle(kw.count)}`}
          >
            {kw.word}
            <span className="ml-1.5 opacity-50">{kw.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
