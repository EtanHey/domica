'use client';

import { Button } from '@/components/ui/button';
import { Home, Facebook, Building2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export default function ScrapingPocPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">PoC חיפוש נכסים</h1>
        <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
          בחר את המקור ממנו תרצה לצפות בנכסים
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="gap-2">
              בחר מקור נתונים
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push('/scraping-poc/yad2')}
            >
              <Home className="h-4 w-4" />
              יד2
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push('/scraping-poc/facebook')}
            >
              <Facebook className="h-4 w-4" />
              פייסבוק
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push('/scraping-poc/madlan')}
            >
              <Building2 className="h-4 w-4" />
              מדלן
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
