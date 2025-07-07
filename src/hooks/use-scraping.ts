'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

interface ScrapeYad2Params {
  url: string;
  maxListings?: number;
}

interface ScrapeYad2Response {
  success: boolean;
  listings: number;
  created: number;
  updated: number;
  duplicates: number;
  message: string;
}

export function useScrapeYad2() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<ScrapeYad2Response, Error, ScrapeYad2Params>({
    mutationKey: MutationKeys.scrapeYad2,
    mutationFn: async ({ url, maxListings = 10 }) => {
      const response = await fetch('/api/scrape-yad2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          maxListings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }

      return data;
    },
    onSuccess: (data) => {
      const details: string[] = [];
      if (data.created > 0) details.push(`${data.created} נוספו`);
      if (data.updated > 0) details.push(`${data.updated} עודכנו`);
      if (data.duplicates > 0) details.push(`${data.duplicates} כפילויות נמצאו`);

      const description = details.length > 0 ? details.join(', ') : 'לא נמצאו דירות חדשות';

      toast({
        title: '✅ סיום סריקה',
        description,
      });

      if (data.listings > 0) {
        void queryClient.invalidateQueries({ queryKey: QueryKeys.properties.all });
      }
    },
    onError: (error) => {
      toast({
        title: '❌ שגיאה',
        description: error instanceof Error ? error.message : 'שגיאה בייבוא',
        variant: 'destructive',
      });
    },
  });
}

export function useScrapeFacebook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, void>({
    mutationKey: MutationKeys.scrapeFacebook,
    mutationFn: async () => {
      throw new Error('Facebook scraping not yet implemented');
    },
    onSuccess: () => {
      toast({
        title: '✅ הצלחה',
        description: 'פוסטים מפייסבוק יובאו בהצלחה',
      });

      void queryClient.invalidateQueries({ queryKey: QueryKeys.properties.all });
    },
    onError: (error) => {
      toast({
        title: '❌ שגיאה',
        description: error instanceof Error ? error.message : 'נכשל ייבוא מפייסבוק',
        variant: 'destructive',
      });
    },
  });
}
