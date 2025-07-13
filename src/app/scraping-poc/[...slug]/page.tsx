'use client';

import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Key, Tag, AlertCircle } from 'lucide-react';
import { ListingType, ListingTypeValue } from '@/types/listing';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default function ScrapingDynamicPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  
  // Parse the slug to determine type and page
  let type: ListingTypeValue = ListingType.All;
  let page = '1';
  
  if (slug.length === 1) {
    // /scraping-poc/[page] - All properties
    page = slug[0];
  } else if (slug.length === 2) {
    // /scraping-poc/[type]/[page]
    const potentialType = slug[0];
    const validTypes = Object.values(ListingType);
    
    if (validTypes.includes(potentialType as any)) {
      type = potentialType as ListingTypeValue;
      page = slug[1];
    } else {
      notFound();
    }
  } else {
    notFound();
  }
  
  // Validate page number
  if (!/^\d+$/.test(page)) {
    notFound();
  }
  
  const handleTabChange = (value: string) => {
    if (value === ListingType.All) {
      router.push('/scraping-poc/1');
    } else {
      router.push(`/scraping-poc/${value}/1`);
    }
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">PoC חיפוש ויד2</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">הדגמה של מערכת חיפוש וגירוד נתונים מיד2</p>
      </div>
      
      <Yad2ScraperWrapper />
      
      <section>
        <div className="w-full">
          <h2 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            נכסים זמינים
          </h2>

          <Tabs value={type} onValueChange={handleTabChange} className="w-full" dir="rtl">
            <TabsList className="mx-auto mb-8 grid h-16 w-full max-w-3xl grid-cols-4 gap-2 bg-gray-100 p-2 dark:bg-gray-800">
              <TabsTrigger
                value={ListingType.All}
                className="h-full border-2 border-transparent text-base font-semibold transition-all hover:bg-gray-200 data-[state=active]:border-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-xl dark:hover:bg-gray-700 dark:data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white"
              >
                <span className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  כל הנכסים
                </span>
              </TabsTrigger>
              <TabsTrigger
                value={ListingType.Rent}
                className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-green-200 hover:bg-green-50 data-[state=active]:border-green-600 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-green-800 dark:hover:bg-green-950 dark:data-[state=active]:border-green-500 dark:data-[state=active]:bg-green-600"
              >
                <span className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  להשכרה
                </span>
              </TabsTrigger>
              <TabsTrigger
                value={ListingType.Sale}
                className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-blue-200 hover:bg-blue-50 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-blue-800 dark:hover:bg-blue-950 dark:data-[state=active]:border-blue-500 dark:data-[state=active]:bg-blue-600"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  למכירה
                </span>
              </TabsTrigger>
              <TabsTrigger
                value={ListingType.Review}
                className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-yellow-200 hover:bg-yellow-50 data-[state=active]:border-yellow-600 data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-yellow-800 dark:hover:bg-yellow-950 dark:data-[state=active]:border-yellow-500 dark:data-[state=active]:bg-yellow-600"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  לבדיקה
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <PropertyGrid 
            listingType={type} 
            initialPage={parseInt(page)} 
          />
        </div>
      </section>
    </div>
  );
}