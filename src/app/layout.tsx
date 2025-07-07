import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Home } from 'lucide-react';

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
      <body className={`${rubik.variable} font-sans antialiased bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100`}>
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">דומיקה - Domica</h1>
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
