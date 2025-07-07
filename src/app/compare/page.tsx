import { Suspense } from 'react';
import ComparePageContent from '@/components/compare-page-content';

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8" dir="rtl">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
              <p className="text-muted-foreground">טוען...</p>
            </div>
          </div>
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
