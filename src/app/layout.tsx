import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';

// Use Rubik font which supports Hebrew
const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin', 'hebrew'],
});

export const metadata: Metadata = {
  title: 'Domica - דומיקה',
  description: 'Real estate platform for finding your perfect rental',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} font-sans antialiased`}>
        <QueryProvider>
          <div className="min-h-screen">
            <header className="border-b">
              <div className="container mx-auto flex items-center justify-between px-4 py-4">
                <h1 className="text-2xl font-bold">דומיקה - Domica</h1>
              </div>
            </header>
            <main>{children}</main>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
