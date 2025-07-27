import Link from 'next/link';
import { Search, Home as HomeIcon, ArrowLeft } from 'lucide-react';

interface AllPropertiesPageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function AllPropertiesPageWithPagination({ params }: AllPropertiesPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page) || 1;

  return (
    <div className="container mx-auto space-y-8 px-4 py-8 text-center">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
          ברוכים הבאים לדומיקה
        </h1>
        <p className="mb-8 text-xl text-gray-600 dark:text-gray-400">
          פלטפורמת נדל"ן מתקדמת למציאת הנכס המושלם
        </p>

        <div className="mx-auto grid max-w-xl gap-6 md:grid-cols-2">
          <Link
            href="/scraping-poc"
            className="group rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-400"
          >
            <div className="flex flex-col items-center text-center">
              <Search className="mb-4 h-12 w-12 text-blue-500 transition-transform group-hover:scale-110" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                PoC חיפוש
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                הדגמה של מערכת חיפוש וגירוד נתונים מיד2
              </p>
              <ArrowLeft className="mt-2 h-4 w-4 text-blue-500 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <div className="group rounded-lg border border-gray-200 bg-gray-50 p-6 opacity-75 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex flex-col items-center text-center">
              <HomeIcon className="mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-500 dark:text-gray-400">
                PoC נוספים
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">בקרוב - הדגמות נוספות</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
