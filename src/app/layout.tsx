import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import Link from 'next/link';
import Image from 'next/image';
import { HeaderNav } from '@/components/header-nav';

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
                  <div className="flex items-center justify-between">
                    <HeaderNav />
                    <Link href="/" className="transition-opacity hover:opacity-80">
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
