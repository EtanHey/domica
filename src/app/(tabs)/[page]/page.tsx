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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          ברוכים הבאים לדומיקה
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          פלטפורמת נדל"ן מתקדמת למציאת הנכס המושלם
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-xl mx-auto">
          <Link 
            href="/scraping-poc"
            className="group p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg bg-white dark:bg-gray-800"
          >
            <div className="flex flex-col items-center text-center">
              <Search className="h-12 w-12 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                PoC חיפוש
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                הדגמה של מערכת חיפוש וגירוד נתונים מיד2
              </p>
              <ArrowLeft className="h-4 w-4 text-blue-500 mt-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          
          <div className="group p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 opacity-75">
            <div className="flex flex-col items-center text-center">
              <HomeIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">
                PoC נוספים
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                בקרוב - הדגמות נוספות
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
