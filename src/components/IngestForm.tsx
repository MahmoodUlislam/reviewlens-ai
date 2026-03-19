"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function IngestForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [productName, setProductName] = useState("");
  const [platform, setPlatform] = useState("Amazon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError("Please enter a product URL");
      return;
    }
    await submitIngest({ type: "url", url: url.trim(), platform });
  };

  const handleCsvSubmit = async () => {
    if (!csvText.trim()) {
      setError("Please paste CSV data or upload a file");
      return;
    }
    await submitIngest({
      type: "csv",
      csvData: csvText.trim(),
      productName: productName.trim() || "Uploaded Product",
      platform,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const submitIngest = async (body: Record<string, string>) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to ingest reviews");
        return;
      }

      // Store sessionId and navigate to dashboard
      sessionStorage.setItem("reviewlens_session", data.sessionId);
      sessionStorage.setItem(
        "reviewlens_metadata",
        JSON.stringify(data.metadata)
      );
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Ingest Reviews</CardTitle>
        <CardDescription>
          Load product reviews by entering a URL or uploading a CSV file.
          Reviews will be analyzed for sentiment and made available for Q&A.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="Amazon">Amazon</option>
              <option value="Google Maps">Google Maps</option>
              <option value="G2">G2</option>
              <option value="Capterra">Capterra</option>
              <option value="Yelp">Yelp</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              URL Scrape
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Product URL
              </label>
              <Input
                placeholder="https://www.amazon.com/dp/B0..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the Amazon product page URL. Our scraper will extract
                reviews automatically.
              </p>
            </div>
            <Button
              onClick={handleUrlSubmit}
              disabled={loading || !url.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping Reviews...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Scrape Reviews
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Product Name
              </label>
              <Input
                placeholder="e.g., Apple AirPods Pro (2nd Gen)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Upload CSV File
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>{fileName}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a CSV file
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Or Paste CSV Data
              </label>
              <Textarea
                placeholder={`rating,title,body,date,reviewer\n5,"Great product!","Love this item...",2024-01-15,"John D."\n3,"Okay","Average quality...",2024-01-10,"Jane S."`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                disabled={loading}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: rating, body. Optional: title, date,
                reviewer, verified
              </p>
            </div>

            <Button
              onClick={handleCsvSubmit}
              disabled={loading || !csvText.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Reviews...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
