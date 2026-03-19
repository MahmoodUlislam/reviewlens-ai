"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KeywordsCloudProps {
  keywords: { word: string; count: number }[];
}

export default function KeywordsCloud({ keywords }: KeywordsCloudProps) {
  if (keywords.length === 0) return null;

  const maxCount = keywords[0]?.count || 1;

  const getSize = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return "text-lg font-bold";
    if (ratio > 0.4) return "text-base font-semibold";
    return "text-sm font-medium";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <Badge
              key={kw.word}
              variant="secondary"
              className={`${getSize(kw.count)} cursor-default`}
            >
              {kw.word}
              <span className="ml-1 opacity-60">{kw.count}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
