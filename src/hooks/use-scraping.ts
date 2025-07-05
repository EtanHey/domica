import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ScrapeYad2Params {
  url: string;
  maxListings?: number;
}

interface ScrapeYad2Response {
  listings: number;
  created: number;
  updated: number;
  duplicates: number;
  message: string;
}

// Hook for Yad2 scraping
export function useScrapeYad2() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: MutationKeys.scrapeYad2,
    mutationFn: async ({
      url,
      maxListings = 10,
    }: ScrapeYad2Params): Promise<ScrapeYad2Response> => {
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
      // Build detailed message
      const details = [];
      if (data.created > 0) details.push(`${data.created} נוספו`);
      if (data.updated > 0) details.push(`${data.updated} עודכנו`);
      if (data.duplicates > 0) details.push(`${data.duplicates} כפילויות נמצאו`);
      
      const description = details.length > 0 
        ? details.join(', ')
        : 'לא נמצאו דירות חדשות';

      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>סיום סריקה</span>
          </div>
        ) as any,
        description,
        className: '!bg-white dark:!bg-gray-950 !border-2 !border-gray-200 dark:!border-gray-800',
      });

      // Invalidate rentals query to show new listings
      if (data.listings > 0) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
      }
    },
    onError: (error) => {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>שגיאה</span>
          </div>
        ) as any,
        description: error instanceof Error ? error.message : 'שגיאה בייבוא',
        className: '!bg-white dark:!bg-gray-950 !border-2 !border-red-200 dark:!border-red-800',
      });
    },
  });
}

// Hook for Facebook scraping (future implementation)
export function useScrapeFacebook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: MutationKeys.scrapeFacebook,
    mutationFn: async () => {
      // TODO: Implement Facebook scraping
      throw new Error('Facebook scraping not yet implemented');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Facebook posts imported successfully',
      });

      queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scrape Facebook',
        variant: 'destructive',
      });
    },
  });
}
