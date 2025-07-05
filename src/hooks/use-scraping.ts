import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

interface ScrapeYad2Params {
  url: string;
  maxListings?: number;
}

interface ScrapeYad2Response {
  listings: number;
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
      toast({
        title: 'Success',
        description: 'הדירות יובאו בהצלחה',
      });

      // Invalidate rentals query to show new listings
      if (data.listings > 0) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'שגיאה בייבוא',
        variant: 'destructive',
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
