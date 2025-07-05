'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link, Loader2 } from 'lucide-react';
import { useScrapeYad2 } from '@/hooks/use-scraping';

interface Yad2ScraperControlsProps {
  messages: {
    title: string;
    description: string;
    urlLabel: string;
    urlPlaceholder: string;
    importButton: string;
    importing: string;
    rentalExample: string;
    saleExample: string;
    urlRequired: string;
    invalidUrl: string;
  };
}

export function Yad2ScraperControls({ messages }: Yad2ScraperControlsProps) {
  const [yad2Url, setYad2Url] = useState('');
  const { toast } = useToast();
  const scrapeYad2 = useScrapeYad2();

  const handleScrape = async () => {
    if (!yad2Url) {
      toast({
        title: 'Error',
        description: messages.urlRequired,
        variant: 'destructive',
      });
      return;
    }

    if (!yad2Url.includes('yad2.co.il')) {
      toast({
        title: 'Error',
        description: messages.invalidUrl,
        variant: 'destructive',
      });
      return;
    }

    scrapeYad2.mutate(
      {
        url: yad2Url,
        maxListings: 10,
      },
      {
        onSuccess: () => {
          setYad2Url(''); // Clear the input on success
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.title}</CardTitle>
        <CardDescription>{messages.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-lg p-3">
          <p className="text-muted-foreground text-sm">{messages.description}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium">{messages.rentalExample}</p>
            <code className="bg-background block rounded p-2 text-xs">
              https://www.yad2.co.il/realestate/rent?city=5000&minRooms=3
            </code>
            <p className="mt-2 text-xs font-medium">{messages.saleExample}</p>
            <code className="bg-background block rounded p-2 text-xs">
              https://www.yad2.co.il/realestate/forsale?city=1200&minRooms=3
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yad2-url">{messages.urlLabel}</Label>
          <div className="relative">
            <Link className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              id="yad2-url"
              placeholder={messages.urlPlaceholder}
              value={yad2Url}
              onChange={(e) => setYad2Url(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Button onClick={handleScrape} disabled={scrapeYad2.isPending} className="w-full">
          {scrapeYad2.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {scrapeYad2.isPending ? messages.importing : messages.importButton}
        </Button>
      </CardContent>
    </Card>
  );
}
