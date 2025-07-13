'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Key, Tag, AlertCircle } from 'lucide-react';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Check if we're on the home page
  const isHomePage = pathname === '/';

  // If on home page, just render children without tabs
  if (isHomePage) {
    return <>{children}</>;
  }

  // Extract tab from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const currentTab =
    pathParts.length === 0 || pathParts[0] === '1' || /^\d+$/.test(pathParts[0])
      ? 'all'
      : pathParts[0] || 'all';

  const handleTabChange = (value: string) => {
    if (value === 'all') {
      router.push('/1');
    } else {
      router.push(`/${value}/1`);
    }
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">מצא את הדירה המושלמת שלך</p>
      </div>

      <div className="w-full">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          נכסים זמינים
        </h2>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mx-auto mb-8 grid h-16 w-full max-w-3xl grid-cols-4 gap-2 bg-gray-100 p-2 dark:bg-gray-800">
            <TabsTrigger
              value="all"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:bg-gray-200 data-[state=active]:border-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-xl dark:hover:bg-gray-700 dark:data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white"
            >
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                כל הנכסים
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="rent"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-green-200 hover:bg-green-50 data-[state=active]:border-green-600 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-green-800 dark:hover:bg-green-950 dark:data-[state=active]:border-green-500 dark:data-[state=active]:bg-green-600"
            >
              <span className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                להשכרה
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sale"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-blue-200 hover:bg-blue-50 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-blue-800 dark:hover:bg-blue-950 dark:data-[state=active]:border-blue-500 dark:data-[state=active]:bg-blue-600"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                למכירה
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-yellow-200 hover:bg-yellow-50 data-[state=active]:border-yellow-600 data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-xl dark:hover:border-yellow-800 dark:hover:bg-yellow-950 dark:data-[state=active]:border-yellow-500 dark:data-[state=active]:bg-yellow-600"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                לבדיקה
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  );
}
