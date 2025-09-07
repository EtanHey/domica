'use client';

import Link from 'next/link';
import { Home, Search, ChevronDown, Facebook } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function HeaderNav() {
  const router = useRouter();

  return (
    <nav className="flex items-center gap-6">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <Home className="h-5 w-5" />
        בית
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <Search className="h-5 w-5" />
            PoC חיפוש
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-gray-800">
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => router.push('/scraping-poc')}
          >
            <Search className="h-4 w-4" />
            כל המקורות
          </DropdownMenuItem>
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
            <Home className="h-4 w-4" />
            מדלן
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
