'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Loader2, Link } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ScraperControls() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [groupUrl, setGroupUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scraperType, setScraperType] = useState<'mock' | 'group' | 'firecrawl'>('firecrawl');
  const { toast } = useToast();

  const handleScrape = async () => {
    setIsLoading(true);

    try {
      let action = 'scrape';
      let config: Record<string, unknown> = {};

      if (scraperType === 'mock') {
        if (!searchQuery && !location) {
          toast({
            title: 'Missing Information',
            description: 'Please provide either a search query or location',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        action = 'scrape';
        config = { searchQuery, location };
      } else if (scraperType === 'group' || scraperType === 'firecrawl') {
        if (!groupUrl) {
          toast({
            title: 'Missing Information',
            description: 'Please provide a Facebook group URL',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        action = scraperType === 'firecrawl' ? 'scrape-firecrawl' : 'scrape-group';
        config = { groupUrl, maxPosts: 10 };
      }

      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, config }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }

      toast({
        title: 'Scraping Complete',
        description: `${data.result?.message || 'Successfully completed scraping task'}`,
      });

      // Refresh the page to show new listings
      if (data.result?.listings_found > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: 'Scraping Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Rental Scraper</CardTitle>
        <CardDescription>Search for rental listings from Facebook Groups</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="firecrawl"
          onValueChange={(v) => setScraperType(v as 'firecrawl' | 'group' | 'mock')}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="firecrawl">Firecrawl (Recommended)</TabsTrigger>
            <TabsTrigger value="group">Playwright</TabsTrigger>
            <TabsTrigger value="mock">Mock Data</TabsTrigger>
          </TabsList>

          <TabsContent value="firecrawl" className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">
                Uses Firecrawl API for reliable scraping with automatic JavaScript rendering.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-url-firecrawl">Facebook Group URL</Label>
              <div className="relative">
                <Link className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  id="group-url-firecrawl"
                  placeholder="https://www.facebook.com/groups/635300218596838"
                  value={groupUrl}
                  onChange={(e) => setGroupUrl(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">
                Uses Playwright for direct Facebook scraping. Requires Facebook credentials in
                environment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-url">Facebook Group URL</Label>
              <div className="relative">
                <Link className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  id="group-url"
                  placeholder="https://www.facebook.com/groups/635300218596838"
                  value={groupUrl}
                  onChange={(e) => setGroupUrl(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mock" className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground text-sm">
                Mock scraper for testing - generates sample data without actual scraping.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search Query</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="e.g., 2 bedroom apartment"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  id="location"
                  placeholder="e.g., Tel Aviv, Israel"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handleScrape} disabled={isLoading} className="mt-4 w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Scraping...' : 'Start Scraping'}
        </Button>
      </CardContent>
    </Card>
  );
}
