'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Key, Tag, AlertCircle } from 'lucide-react';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract tab from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const currentTab = pathParts.length === 0 || pathParts[0] === '1' || /^\d+$/.test(pathParts[0])
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
        <p className="text-muted-foreground text-lg">מצא את הדירה המושלמת שלך</p>
      </div>

      <div className="w-full">
        <h2 className="mb-6 text-center text-3xl font-bold">נכסים זמינים</h2>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-background mx-auto mb-8 grid h-16 w-full max-w-3xl grid-cols-4 gap-2 p-2">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:text-foreground hover:bg-muted/50 h-full border-2 border-transparent text-base font-semibold transition-all data-[state=active]:shadow-xl"
            >
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                כל הנכסים
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="rent"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-green-200 hover:bg-green-50 data-[state=active]:border-green-600 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-xl"
            >
              <span className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                להשכרה
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sale"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-blue-200 hover:bg-blue-50 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-xl"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                למכירה
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="h-full border-2 border-transparent text-base font-semibold transition-all hover:border-yellow-200 hover:bg-yellow-50 data-[state=active]:border-yellow-600 data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-xl"
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
