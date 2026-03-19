"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Info,
} from "lucide-react";

interface PlatformConfig {
  urlSupported: boolean;
  placeholder: string;
  helpText: string;
  urlLabel: string;
  instructions: string[];
}

const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  Amazon: {
    urlSupported: true,
    placeholder: "https://www.amazon.com/dp/B0...",
    urlLabel: "Product URL",
    helpText: "Paste the full Amazon product page URL. Reviews will be scraped automatically.",
    instructions: [
      "Go to the Amazon product page you want to analyze.",
      "Copy the full URL from the browser address bar.",
      "Paste it below — we'll extract and analyze all available reviews.",
    ],
  },
  "Google Maps": {
    urlSupported: true,
    placeholder: "https://www.google.com/maps/place/...",
    urlLabel: "Place URL",
    helpText: "Paste a Google Maps place URL. Reviews will be scraped automatically.",
    instructions: [
      "Search for the business/place on Google Maps.",
      "Click on the listing to open its details.",
      "Copy the URL from the browser address bar and paste it below.",
    ],
  },
  Other: {
    urlSupported: false,
    placeholder: "",
    urlLabel: "",
    helpText: "",
    instructions: [
      "Export reviews from your platform as a CSV file.",
      "Upload the file or paste the CSV data below.",
      "Columns are auto-detected — any format works (rating, text, date, author, etc.).",
    ],
  },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — matches server limit

export default function IngestForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [productName, setProductName] = useState("");
  const [platform, setPlatform] = useState("Amazon");
  const [activeTab, setActiveTab] = useState("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [pastedCsv, setPastedCsv] = useState("");

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.Other;

  // When switching to a non-URL platform, force CSV tab
  const handlePlatformChange = (value: string) => {
    setPlatform(value);
    setError("");
    const cfg = PLATFORM_CONFIG[value] || PLATFORM_CONFIG.Other;
    if (!cfg.urlSupported) {
      setActiveTab("csv");
    }
  };

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
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`);
      return;
    }
    setError("");
    setFileName(file.name);
    setPastedCsv("");
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
          Load product reviews by URL or CSV. Reviews will be analyzed for sentiment and made available for Q&amp;A.
        </p>
      </div>

      <div className="mb-5">
        <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => handlePlatformChange(e.target.value)}
          className="w-full rounded-lg glass px-3 py-2.5 text-sm text-white/80 bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
        >
          <option value="Amazon">Amazon</option>
          <option value="Google Maps">Google Maps</option>
          <option value="Other">Other Platform</option>
        </select>
      </div>

      {/* Platform-specific instructions */}
      <div className="mb-5 p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/15 animate-fade-in">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-violet-300 mb-1.5">
              {config.urlSupported ? "How to get reviews" : "CSV upload only"}
            </p>
            <ol className="text-xs text-white/40 space-y-1 list-decimal list-inside">
              {config.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {config.urlSupported ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                {config.urlLabel}
              </label>
              <Input
                placeholder={config.placeholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20"
              />
              <p className="text-xs text-white/30 mt-1.5">
                {config.helpText}
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
                  Scraping {platform} Reviews...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Scrape {platform} Reviews
                </>
              )}
            </button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-5">
            <CsvUploadFields
              productName={productName}
              setProductName={setProductName}
              csvText={csvText}
              setCsvText={setCsvText}
              pastedCsv={pastedCsv}
              setPastedCsv={setPastedCsv}
              fileName={fileName}
              setFileName={setFileName}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              handleCsvSubmit={handleCsvSubmit}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* Other platform — CSV only, no tabs */
        <div className="space-y-4 mt-2">
          <CsvUploadFields
            productName={productName}
            setProductName={setProductName}
            csvText={csvText}
            setCsvText={setCsvText}
            pastedCsv={pastedCsv}
            setPastedCsv={setPastedCsv}
            fileName={fileName}
            setFileName={setFileName}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            handleCsvSubmit={handleCsvSubmit}
            loading={loading}
          />
        </div>
      )}

      {error && (
        <div className="mt-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 glow-red animate-scale-in">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Extracted CSV upload fields (reused in tabs and standalone modes)   */
/* ------------------------------------------------------------------ */

interface CsvUploadFieldsProps {
  productName: string;
  setProductName: (v: string) => void;
  csvText: string;
  setCsvText: (v: string) => void;
  pastedCsv: string;
  setPastedCsv: (v: string) => void;
  fileName: string;
  setFileName: (v: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCsvSubmit: () => void;
  loading: boolean;
}

function CsvUploadFields({
  productName,
  setProductName,
  csvText,
  setCsvText,
  pastedCsv,
  setPastedCsv,
  fileName,
  setFileName,
  fileInputRef,
  handleFileUpload,
  handleCsvSubmit,
  loading,
}: CsvUploadFieldsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "txt") return;

    if (file.size > MAX_FILE_SIZE) {
      // Can't call setError directly — handled by parent via handleFileUpload
      return;
    }

    setFileName(file.name);
    setPastedCsv("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  }, [setCsvText, setFileName, setPastedCsv]);

  return (
    <>
      <div>
        <label className="text-xs font-medium text-white/50 mb-1.5 block uppercase tracking-wider">
          Product / Business Name
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
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group ${
            isDragging
              ? "border-violet-400 bg-violet-500/10 scale-[1.02]"
              : "border-white/15 hover:border-violet-500/40 hover:bg-violet-500/5"
          }`}
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
          ) : isDragging ? (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-violet-400 animate-bounce" />
              <p className="text-sm text-violet-300 font-medium">Drop your CSV file here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <FileText className="w-10 h-10 mx-auto text-white/20 group-hover:text-violet-400/50 transition-colors" />
              <p className="text-sm text-white/30">Drag &amp; drop a CSV file here, or click to browse</p>
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
          value={pastedCsv}
          onChange={(e) => {
            setPastedCsv(e.target.value);
            setCsvText(e.target.value);
            if (e.target.value.trim()) {
              setFileName("");
            }
          }}
          disabled={loading}
          className="font-mono text-xs bg-white/5 border-white/10 text-white/70 placeholder:text-white/15 focus:border-violet-500/50 focus:ring-violet-500/20 h-36 max-h-36 overflow-y-auto resize-none"
        />
        <p className="text-xs text-white/30 mt-1.5">
          Any CSV format accepted — columns are auto-detected from headers and content.
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
    </>
  );
}
