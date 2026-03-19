"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      sessionStorage.setItem("reviewlens_session", data.sessionId);
      sessionStorage.setItem("reviewlens_metadata", JSON.stringify(data.metadata));
      sessionStorage.setItem("reviewlens_reviews", JSON.stringify(data.reviews));
      sessionStorage.setItem("reviewlens_analytics", JSON.stringify(data.analytics));
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-card rounded-2xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white/90">Ingest Reviews</h2>
        <p className="text-sm text-white/40 mt-1">
          Load product reviews by URL or CSV. Reviews will be analyzed for sentiment and made available for Q&A.
        </p>
      </div>

      <div className="mb-5">
        <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full rounded-lg glass px-3 py-2.5 text-sm text-white/80 bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
        >
          <option value="Amazon">Amazon</option>
          <option value="Google Maps">Google Maps</option>
          <option value="G2">G2</option>
          <option value="Capterra">Capterra</option>
          <option value="Yelp">Yelp</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-lg p-1">
          <TabsTrigger value="url" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 rounded-md">
            <Globe className="w-4 h-4" />
            URL Scrape
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 rounded-md">
            <Upload className="w-4 h-4" />
            CSV Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4 mt-5">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
              Product URL
            </label>
            <Input
              placeholder="https://www.amazon.com/dp/B0..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
            />
            <p className="text-xs text-white/30 mt-1.5">
              Enter the Amazon product page URL. Reviews will be extracted automatically.
            </p>
          </div>
          <button
            onClick={handleUrlSubmit}
            disabled={loading || !url.trim()}
            className="w-full gradient-btn text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping Reviews...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Scrape Reviews
              </>
            )}
          </button>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4 mt-5">
          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
              Product Name
            </label>
            <Input
              placeholder="e.g., Apple AirPods Pro (2nd Gen)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={loading}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
              Upload CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all duration-300 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{fileName}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-white/20 group-hover:text-violet-400/50 transition-colors" />
                  <p className="text-sm text-white/30">Click to upload a CSV file</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
              Or Paste CSV Data
            </label>
            <Textarea
              placeholder={`rating,title,body,date,reviewer\n5,"Great product!","Love this...",2024-01-15,"John D."`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              disabled={loading}
              className="font-mono text-xs bg-white/5 border-white/10 text-white/70 placeholder:text-white/15 focus:border-violet-500/50 focus:ring-violet-500/20"
            />
            <p className="text-xs text-white/30 mt-1.5">
              Required columns: rating, body. Optional: title, date, reviewer, verified
            </p>
          </div>

          <button
            onClick={handleCsvSubmit}
            disabled={loading || !csvText.trim()}
            className="w-full gradient-btn text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Reviews...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload &amp; Analyze
              </>
            )}
          </button>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="mt-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 glow-red animate-scale-in">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
