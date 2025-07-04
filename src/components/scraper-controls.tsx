"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Upload, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// <scratchpad>Component to control Python scraper from the UI</scratchpad>

export function ScraperControls() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();

  const triggerScraper = async (action: string, config?: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, config }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scraper failed");
      }

      toast({
        title: "Success",
        description: `${action} completed successfully`,
      });

      // If it's a scrape action, refresh the page to show new data
      if (action === "scrape") {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }

      return data;
    } catch (error) {
      console.error("Scraper error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run scraper",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Rental Scraper Controls</CardTitle>
        <CardDescription>
          Manage rental data collection and processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scrape Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Scrape Rentals</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="e.g., apartment for rent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button
            onClick={() => triggerScraper("scrape", { searchQuery, location })}
            disabled={loading || (!searchQuery && !location)}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Start Scraping
              </>
            )}
          </Button>
        </div>

        {/* Other Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            onClick={() => triggerScraper("upload-images")}
            disabled={loading}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Process Images
          </Button>
          <Button
            onClick={() => triggerScraper("analyze")}
            disabled={loading}
            variant="outline"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Run Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}