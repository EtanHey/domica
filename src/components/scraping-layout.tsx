'use client';

import { ReactNode, useState } from 'react';
import { PropertyGrid } from '@/components/property-grid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Key, Tag, AlertCircle, ArrowRight, ChevronDown, Facebook } from 'lucide-react';
import { ListingType, ListingTypeValue } from '@/types/listing';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface ScrapingLayoutProps {
  title: string;
  description: string;
  sourcePlatform: 'yad2' | 'facebook';
  showScraperComponent?: boolean;
  scraperComponent?: ReactNode;
  actionButton?: ReactNode;
  toggleableSection?: ReactNode;
  onToggleSection?: () => void;
  showToggleSection?: boolean;
  toggleButtonText?: { show: string; hide: string };
}

export function ScrapingLayout({
  title,
  description,
  sourcePlatform,
  showScraperComponent = false,
  scraperComponent,
  actionButton,
  toggleableSection,
  onToggleSection,
  showToggleSection = false,
  toggleButtonText,
}: ScrapingLayoutProps) {
  const [listingType, setListingType] = useState<ListingTypeValue>(ListingType.All);
  const router = useRouter();

  const handleTabChange = (value: string) => {
    setListingType(value as ListingTypeValue);
  };

  const getPlatformLabel = () => {
    switch (sourcePlatform) {
      case 'yad2':
        return 'נכסים מיד2';
      case 'facebook':
        return 'נכסים שנשמרו מפייסבוק';
      default:
        return 'נכסים';
    }
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/scraping-poc">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {sourcePlatform === 'yad2' ? (
                  <>
                    <Home className="h-4 w-4" />
                    יד2
                  </>
                ) : (
                  <>
                    <Facebook className="h-4 w-4" />
                    פייסבוק
                  </>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => router.push('/scraping-poc/yad2')}
                disabled={sourcePlatform === 'yad2'}
              >
                <Home className="h-4 w-4" />
                יד2
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => router.push('/scraping-poc/facebook')}
                disabled={sourcePlatform === 'facebook'}
              >
                <Facebook className="h-4 w-4" />
                פייסבוק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>

      {showScraperComponent && scraperComponent}

      {(actionButton || toggleableSection) && (
        <div className="mb-8 flex justify-center">
          {actionButton ||
            (toggleableSection && onToggleSection && (
              <Button className="gap-2" onClick={onToggleSection}>
                <Facebook className="h-5 w-5" />
                {showToggleSection ? toggleButtonText?.hide : toggleButtonText?.show}
              </Button>
            ))}
        </div>
      )}

      {showToggleSection && toggleableSection && <div className="mb-8">{toggleableSection}</div>}

      <section>
        <div className="w-full">
          <h2 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {getPlatformLabel()}
          </h2>

          <Tabs value={listingType} onValueChange={handleTabChange} className="w-full" dir="rtl">
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

          <PropertyGrid listingType={listingType} initialPage={1} sourcePlatform={sourcePlatform} />
        </div>
      </section>
    </div>
  );
}
