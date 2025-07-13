import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Search } from 'lucide-react';

// Use Rubik font which supports Hebrew
const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin', 'hebrew'],
});

export const metadata: Metadata = {
  title: 'Domica - דומיקה',
  description: 'Real estate platform for finding your perfect property',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${rubik.variable} bg-white font-sans text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="container mx-auto px-4 py-4">
<<<<<<< HEAD
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    דומיקה - Domica
                  </h1>
=======
                  <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-4">
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Home className="h-4 w-4" />
                        בית
                      </Link>
                      <Link 
                        href="/scraping-poc" 
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Search className="h-4 w-4" />
                        PoC חיפוש
                      </Link>
                    </nav>
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                      <Image 
                        src="/domica_logo.png" 
                        alt="דומיקה - Domica" 
                        width={160} 
                        height={40}
                        className="h-10 w-auto"
                        priority
                      />
                    </Link>
                  </div>
>>>>>>> 50984b7 (Working version finally)
                </div>
              </header>
              <main>{children}</main>
            </div>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
