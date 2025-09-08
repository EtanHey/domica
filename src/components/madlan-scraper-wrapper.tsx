'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { MadlanResultsModal } from './madlan-results-modal';
import { 
  Search, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Eye,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  Rocket,
  Play
} from 'lucide-react';

interface MadlanListing {
  id: string;
  title: string;
  price: number;
  address: string;
  city: string;
  neighborhood: string;
  rooms: number;
  area: number;
  floor: number;
  totalFloors: number;
  propertyType: string;
  description: string;
  images: string[];
  amenities: string[];
  entryDate: string;
  publishDate: string;
  contactName: string;
  contactPhone: string;
  isPromoted: boolean;
}

interface SaveStatus {
  success?: boolean;
  message?: string;
  savedCount?: number;
  updatedCount?: number;
  skippedDuplicates?: number;
  totalCount?: number;
}

interface ScrapingProgress {
  stage: 'urls' | 'scraping' | 'saving' | 'complete';
  message: string;
  current?: number;
  total?: number;
  completed?: number;
  percentage?: number;
}

export function MadlanScraperWrapper() {
  const [searchUrl, setSearchUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listings, setListings] = useState<MadlanListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateOnly, setIsPrivateOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<ScrapingProgress | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [scrapingComplete, setScrapingComplete] = useState(false);
  const [lastScrapeStats, setLastScrapeStats] = useState<{
    totalFound: number;
    processed: number;
    timeElapsed: string;
  } | null>(null);

  // Auto-open modal when scraping completes
  useEffect(() => {
    if (scrapingComplete && listings.length > 0) {
      setShowResultsModal(true);
      setScrapingComplete(false);
    }
  }, [scrapingComplete, listings.length]);

  // Poll for real-time progress updates
  const pollProgress = async (sessionId: string) => {
    const maxAttempts = 300; // 5 minutes max (every 1000ms)
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      try {
        attempts++;
        const response = await fetch(`/api/scrape-madlan-progress?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data.progress) {
          setScrapingProgress(data.progress);
          
          // If complete or error, stop polling
          if (data.progress.stage === 'complete' || data.progress.stage === 'error') {
            return;
          }
          
          // Continue polling if still in progress and under max attempts
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll every second
          }
        } else if (attempts < maxAttempts) {
          // No progress yet, keep polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Progress polling error:', error);
        // Continue polling on error if under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Wait a bit longer on error
        }
      }
    };
    
    poll();
  };

  const handleSaveToSupabase = async () => {
    if (listings.length === 0) {
      setSaveStatus({ success: false, message: 'אין נכסים לשמירה' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setScrapingProgress({
      stage: 'saving',
      message: 'שומר נכסים למסד הנתונים...',
      percentage: 0
    });

    try {
      // Add source URL to each listing
      const listingsWithSource = listings.map(listing => ({
        ...listing,
        sourceUrl: searchUrl
      }));

      const response = await fetch('/api/save-madlan-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: listingsWithSource }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשמירת הנכסים');
      }

      setScrapingProgress({
        stage: 'complete',
        message: 'נכסים נשמרו בהצלחה!',
        percentage: 100
      });

      setSaveStatus({
        success: true,
        message: `נשמרו ${data.savedCount} מתוך ${data.totalCount} נכסים בהצלחה`,
        savedCount: data.savedCount,
        updatedCount: data.updatedCount,
        skippedDuplicates: data.skippedDuplicates,
        totalCount: data.totalCount
      });

      // Clear progress after delay
      setTimeout(() => {
        setScrapingProgress(null);
        setSaveStatus(null);
      }, 5000);
    } catch (err) {
      setScrapingProgress(null);
      setSaveStatus({
        success: false,
        message: err instanceof Error ? err.message : 'שגיאה בשמירת הנכסים'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScrape = async () => {
    if (!searchUrl.includes('madlan.co.il')) {
      setError('נא להזין כתובת URL תקינה של מדלן');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveStatus(null);
    setListings([]);
    setLastScrapeStats(null);
    
    const startTime = Date.now();

    try {
      // Modify URL to add private filter if needed
      let finalUrl = searchUrl;
      if (isPrivateOnly && !searchUrl.includes('private')) {
        if (searchUrl.includes('?')) {
          finalUrl = searchUrl.includes('filters=') 
            ? searchUrl.replace('filters=', 'filters=_0-15000___private_______0-10000_______search-filter-top-bar&tracking_search_source=filter_apply&filters=')
            : searchUrl + '&filters=_0-15000___private_______0-10000_______search-filter-top-bar&tracking_search_source=filter_apply';
        } else {
          finalUrl = searchUrl + '?filters=_0-15000___private_______0-10000_______search-filter-top-bar&tracking_search_source=filter_apply';
        }
      }

      // Generate unique session ID for progress tracking
      const sessionId = `madlan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start polling for progress updates
      pollProgress(sessionId);

      // Start actual scraping with session ID
      const response = await fetch('/api/scrape-madlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: finalUrl, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`שגיאה בגירוד הנתונים: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const endTime = Date.now();
      const timeElapsed = ((endTime - startTime) / 1000).toFixed(1) + ' שניות';

      setListings(data.listings || []);
      setLastScrapeStats({
        totalFound: data.listings?.length || 0,
        processed: data.listings?.length || 0,
        timeElapsed
      });
      setScrapingComplete(true);
      
      // Clear progress after showing completion
      setTimeout(() => {
        setScrapingProgress(null);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים');
      setListings([]);
      setScrapingProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetScraping = () => {
    setListings([]);
    setError(null);
    setSaveStatus(null);
    setScrapingProgress(null);
    setLastScrapeStats(null);
  };

  const hasResults = listings.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-5 w-5" />
              {isLoading && (
                <div className="absolute -top-1 -right-1 h-3 w-3">
                  <Sparkles className="h-3 w-3 text-green-500 animate-pulse" />
                </div>
              )}
            </div>
            חיפוש נכסים במדלן
            {hasResults && (
              <Badge className="bg-green-100 text-green-800 border-green-200 animate-bounce">
                {listings.length} נמצאו!
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            הזן כתובת URL של דף חיפוש במדלן לגירוד נתונים מהיר ומקבילי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.madlan.co.il/for-rent/תל-אביב-יפו-ישראל"
              value={searchUrl}
              onChange={(e) => {
                setSearchUrl(e.target.value);
                if (error) setError(null);
              }}
              className="flex-1"
              dir="ltr"
              disabled={isLoading}
            />
            <Button 
              onClick={handleScrape}
              disabled={isLoading || !searchUrl}
              className="min-w-[140px] relative overflow-hidden group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מחפש...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  חפש נכסים
                </>
              )}
              {!isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="private-only"
              checked={isPrivateOnly}
              onCheckedChange={(checked) => setIsPrivateOnly(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="private-only" className="text-sm flex items-center gap-1">
              <Target className="h-3 w-3" />
              חיפוש עסקאות פרטיות בלבד
            </Label>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              דוגמאות לחיפוש:
            </span>
            {[
              { label: 'השכרה בתל אביב', url: 'https://www.madlan.co.il/for-rent/תל-אביב-יפו-ישראל' },
              { label: 'השכרה בירושלים', url: 'https://www.madlan.co.il/for-rent/ירושלים-ישראל' },
              { label: 'השכרה בחיפה', url: 'https://www.madlan.co.il/for-rent/חיפה-ישראל' },
              { label: 'עסקאות פרטיות בחיפה', url: 'https://www.madlan.co.il/for-rent/חיפה-ישראל', private: true }
            ].map((example, index) => (
              <Button
                key={index}
                variant="link"
                size="sm"
                className="h-auto p-0 hover:scale-105 transition-transform"
                disabled={isLoading}
                onClick={() => {
                  setSearchUrl(example.url);
                  if (example.private) setIsPrivateOnly(true);
                  resetScraping();
                }}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scraping Progress */}
      {scrapingProgress && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                <div className="absolute inset-0 rounded-full border border-green-300 animate-pulse" />
              </div>
              <div>
                <div className="font-medium text-green-800">{scrapingProgress.message}</div>
                <div className="text-sm text-green-600 space-y-1">
                  {scrapingProgress.current && scrapingProgress.total && (
                    <div>עכשיו עובד על: {scrapingProgress.current}/{scrapingProgress.total}</div>
                  )}
                  {scrapingProgress.completed !== undefined && scrapingProgress.total && (
                    <div>הושלמו בהצלחה: {scrapingProgress.completed}/{scrapingProgress.total}</div>
                  )}
                </div>
              </div>
            </div>
            {scrapingProgress.percentage && (
              <Progress value={scrapingProgress.percentage} className="h-2" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>שגיאה</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Summary */}
      {hasResults && lastScrapeStats && !isLoading && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-ping" />
                </div>
                <div>
                  <div className="font-semibold text-green-800 flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    גירוד הושלם בהצלחה!
                  </div>
                  <div className="text-sm text-green-600 flex items-center gap-4">
                    <span>נמצאו {lastScrapeStats.totalFound} נכסים</span>
                    <span>זמן: {lastScrapeStats.timeElapsed}</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setShowResultsModal(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                צפה בתוצאות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Modal */}
      <MadlanResultsModal
        open={showResultsModal}
        onOpenChange={setShowResultsModal}
        listings={listings}
        isLoading={isLoading}
        onSave={handleSaveToSupabase}
        isSaving={isSaving}
        saveStatus={saveStatus}
        searchUrl={searchUrl}
        scrapingStats={lastScrapeStats ? {
          totalFound: lastScrapeStats.totalFound,
          processed: lastScrapeStats.processed,
          saved: 0
        } : undefined}
      />
    </div>
  );
}