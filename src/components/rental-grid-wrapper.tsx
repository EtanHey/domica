'use client';

import { useState } from 'react';
import { RentalGrid } from './rental-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Home, Key, Tag } from 'lucide-react';

export function RentalGridWrapper() {
  const [activeTab, setActiveTab] = useState<'all' | 'rent' | 'sale'>('all');

  return (
    <div className="w-full">
      <h2 className="mb-6 text-center text-3xl font-bold">נכסים זמינים</h2>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'all' | 'rent' | 'sale')}
        className="w-full"
      >
        <TabsList className="bg-background mx-auto mb-8 grid h-16 w-full max-w-2xl grid-cols-3 gap-2 p-2">
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
        </TabsList>

        <TabsContent value="all">
          <RentalGrid listingType="all" />
        </TabsContent>

        <TabsContent value="rent">
          <RentalGrid listingType="rent" />
        </TabsContent>

        <TabsContent value="sale">
          <RentalGrid listingType="sale" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
