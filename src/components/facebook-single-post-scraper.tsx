'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link, Check, X, Copy, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function FacebookSinglePostScraper() {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const testUrls = [
    'https://www.facebook.com/share/p/17AED63Dmv/',
    'https://www.facebook.com/share/p/15xE3fxPsc/',
    'https://www.facebook.com/share/p/1AAMpe3gVw/',
    'https://www.facebook.com/share/p/1787pGM4Uc/',
  ];

  const handleScrape = async (urlToScrape?: string, textToAnalyze?: string) => {
    const targetUrl = urlToScrape || url;
    const targetText = textToAnalyze || manualText;

    if (!targetUrl && !targetText) {
      setError('נא להזין כתובת Facebook או טקסט לניתוח');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);
    setResult(null);

    try {
      const response = await fetch('/api/scrape-facebook-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl || undefined,
          text: targetText || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'שגיאה בחילוץ הנתונים');
        setSuggestion(data.suggestion || null);
        if (data.fallbackData) {
          setResult({ fallbackData: data.fallbackData });
        }
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔗 סריקת פוסט בודד מפייסבוק</CardTitle>
          <CardDescription>הדבק קישור לפוסט בפייסבוק או העתק את הטקסט ישירות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">קישור לפוסט</TabsTrigger>
              <TabsTrigger value="text">הדבקת טקסט</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.facebook.com/share/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="text-left"
                  dir="ltr"
                  disabled={loading}
                />
                <Button onClick={() => handleScrape()} disabled={loading || !url}>
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      סורק...
                    </>
                  ) : (
                    <>
                      <Link className="ml-2 h-4 w-4" />
                      סרוק פוסט
                    </>
                  )}
                </Button>
              </div>

              {/* Quick test links */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">קישורים לדוגמה:</p>
                <div className="grid grid-cols-1 gap-2">
                  {testUrls.map((testUrl, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUrl(testUrl);
                          handleScrape(testUrl);
                        }}
                        disabled={loading}
                      >
                        בדוק
                      </Button>
                      <code className="bg-muted flex-1 rounded p-1 text-xs" dir="ltr">
                        {testUrl}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(testUrl)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>טיפ</AlertTitle>
                <AlertDescription>
                  אם הסריקה האוטומטית נחסמת, פתח את הפוסט בפייסבוק, העתק את הטקסט והדבק כאן
                </AlertDescription>
              </Alert>

              <Textarea
                placeholder="הדבק כאן את תוכן הפוסט מפייסבוק..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[200px]"
                dir="rtl"
                disabled={loading}
              />

              <Button
                onClick={() => handleScrape(undefined, manualText)}
                disabled={loading || !manualText}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מנתח...
                  </>
                ) : (
                  <>
                    <FileText className="ml-2 h-4 w-4" />
                    נתח טקסט
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>שגיאה</AlertTitle>
              <AlertDescription>
                {error}
                {suggestion && <div className="mt-2 font-medium">💡 {suggestion}</div>}
              </AlertDescription>
            </Alert>
          )}

          {result && result.property && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  נמצאה דירה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">כותרת</p>
                    <p className="font-medium">{result.property.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">מחיר</p>
                    <p className="font-medium">{formatPrice(result.property.pricePerMonth)}</p>
                  </div>
                  {result.property.bedrooms && (
                    <div>
                      <p className="text-muted-foreground text-sm">חדרים</p>
                      <p className="font-medium">{result.property.bedrooms}</p>
                    </div>
                  )}
                  {result.property.size && (
                    <div>
                      <p className="text-muted-foreground text-sm">גודל</p>
                      <p className="font-medium">{result.property.size} מ"ר</p>
                    </div>
                  )}
                  {result.property.city && (
                    <div>
                      <p className="text-muted-foreground text-sm">עיר</p>
                      <p className="font-medium">{result.property.city}</p>
                    </div>
                  )}
                  {result.property.neighborhood && (
                    <div>
                      <p className="text-muted-foreground text-sm">שכונה</p>
                      <p className="font-medium">{result.property.neighborhood}</p>
                    </div>
                  )}
                  {result.property.street && (
                    <div>
                      <p className="text-muted-foreground text-sm">רחוב</p>
                      <p className="font-medium">{result.property.street}</p>
                    </div>
                  )}
                  {result.property.floor !== null && (
                    <div>
                      <p className="text-muted-foreground text-sm">קומה</p>
                      <p className="font-medium">{result.property.floor}</p>
                    </div>
                  )}
                  {result.property.contactPhone && (
                    <div>
                      <p className="text-muted-foreground text-sm">טלפון</p>
                      <p className="font-medium" dir="ltr">
                        {result.property.contactPhone}
                      </p>
                    </div>
                  )}
                  {result.property.contactName && (
                    <div>
                      <p className="text-muted-foreground text-sm">איש קשר</p>
                      <p className="font-medium">{result.property.contactName}</p>
                    </div>
                  )}
                  {result.property.availableFrom && (
                    <div>
                      <p className="text-muted-foreground text-sm">כניסה</p>
                      <p className="font-medium">{result.property.availableFrom}</p>
                    </div>
                  )}
                </div>

                {result.property.amenities && result.property.amenities.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-sm">מאפיינים</p>
                    <div className="flex flex-wrap gap-2">
                      {result.property.amenities.map((amenity: string, index: number) => (
                        <span key={index} className="bg-muted rounded-md px-2 py-1 text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.property.description && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-sm">תיאור</p>
                    <Textarea
                      value={result.property.description}
                      readOnly
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {result.property.sourceUrl && result.property.sourceUrl !== 'manual-input' && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(result.property.sourceUrl, '_blank')}
                    >
                      <ExternalLink className="ml-2 h-4 w-4" />
                      פתח בפייסבוק
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(result.property, null, 2))}
                  >
                    <Copy className="ml-2 h-4 w-4" />
                    העתק JSON
                  </Button>
                </div>

                {result.debug && (
                  <div className="text-muted-foreground text-xs">
                    <p>
                      שיטה: {result.debug.method === 'manual-text' ? 'טקסט ידני' : 'סריקה אוטומטית'}
                    </p>
                    <p>אורך תוכן: {result.debug.contentLength} תווים</p>
                    <p>שדות שחולצו: {result.debug.extractedFields}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result && result.fallbackData && !result.property && (
            <Card>
              <CardHeader>
                <CardTitle>תוכן גולמי</CardTitle>
                <CardDescription>לא הצלחנו לחלץ את כל הפרטים</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={result.fallbackData.description}
                  readOnly
                  className="min-h-[200px] text-sm"
                />
                {result.fallbackData.sourceUrl &&
                  result.fallbackData.sourceUrl !== 'manual-input' && (
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => window.open(result.fallbackData.sourceUrl, '_blank')}
                    >
                      <ExternalLink className="ml-2 h-4 w-4" />
                      פתח בפייסבוק
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
