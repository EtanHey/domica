'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Link, Loader2 } from 'lucide-react';
import { useScrapeYad2 } from '@/hooks/use-scraping';

export function Yad2ScraperControls() {
  const [yad2Url, setYad2Url] = useState('');
  const { toast } = useToast();
  const scrapeYad2 = useScrapeYad2();

  const handleScrape = async () => {
    if (!yad2Url) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין כתובת URL',
        variant: 'destructive',
      });
      return;
    }

    if (!yad2Url.includes('yad2.co.il')) {
      toast({
        title: 'שגיאה',
        description: 'כתובת URL לא חוקית',
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
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="yad2-scraper" className="border-none">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex flex-col items-start text-left">
              <h3 className="text-lg font-semibold">יבוא מודעות מיד 2</h3>
              <p className="text-sm text-muted-foreground">יבוא אוטומטי של מודעות דירה מיד 2</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">דוגמאות לכתובות URL:</span>
                  <span className="text-xs text-muted-foreground">לחץ להעתקה</span>
                </div>
                
                <div className="space-y-2">
                  <div 
                    className="group rounded-lg border bg-muted/50 p-3 transition-all hover:bg-muted/70 hover:border-green-500/50 cursor-pointer"
                    onClick={() => setYad2Url('https://www.yad2.co.il/realestate/rent?city=5000&minRooms=3')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-medium">להשכרה</span>
                    </div>
                    <code className="text-xs text-muted-foreground block break-all font-mono">
                      https://www.yad2.co.il/realestate/rent?city=5000&minRooms=3
                    </code>
                  </div>
                  
                  <div 
                    className="group rounded-lg border bg-muted/50 p-3 transition-all hover:bg-muted/70 hover:border-blue-500/50 cursor-pointer"
                    onClick={() => setYad2Url('https://www.yad2.co.il/realestate/forsale?city=1200&minRooms=3')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-xs font-medium">למכירה</span>
                    </div>
                    <code className="text-xs text-muted-foreground block break-all font-mono">
                      https://www.yad2.co.il/realestate/forsale?city=1200&minRooms=3
                    </code>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yad2-url">כתובת יד 2</Label>
                <div className="relative">
                  <Link className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                  <Input
                    id="yad2-url"
                    placeholder="הכנס כתובת URL של יד 2"
                    value={yad2Url}
                    onChange={(e) => setYad2Url(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Button onClick={handleScrape} disabled={scrapeYad2.isPending} className="w-full">
                {scrapeYad2.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {scrapeYad2.isPending ? 'מייבא...' : 'יבוא דירה'}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
