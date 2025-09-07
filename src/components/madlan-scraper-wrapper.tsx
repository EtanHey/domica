'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Square, 
  Calendar,
  Building,
  Car,
  Wifi,
  Wind,
  Shield,
  AlertCircle,
  Loader2,
  Save,
  CheckCircle
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

export function MadlanScraperWrapper() {
  const [searchUrl, setSearchUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listings, setListings] = useState<MadlanListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('results');
  const [isPrivateOnly, setIsPrivateOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<string | null>(null);



  const handleSaveToSupabase = async () => {
    if (listings.length === 0) {
      setSaveStatus({ success: false, message: 'אין נכסים לשמירה' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

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

      setSaveStatus({
        success: true,
        message: `נשמרו ${data.savedCount} מתוך ${data.totalCount} נכסים בהצלחה`
      });

      // Clear listings after successful save
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    } catch (err) {
      setSaveStatus({
        success: false,
        message: err instanceof Error ? err.message : 'שגיאה בשמירת הנכסים'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScrape = async () => {
    setIsLoading(true);
    setError(null);
    setScrapingProgress('מתחיל גירוד נתונים...');

    try {
      if (!searchUrl.includes('madlan.co.il')) {
        throw new Error('נא להזין כתובת URL תקינה של מדלן');
      }

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

      // Use Firecrawl to scrape the actual Madlan page
      setScrapingProgress('גורד עמודי נכסים בודדים לקבלת מידע מלא...');
      const response = await fetch('/api/scrape-madlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: finalUrl }),
      });

      if (!response.ok) {
        throw new Error(`שגיאה בגירוד הנתונים: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setListings(data.listings || []);
      setActiveTab('results');
      setScrapingProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים');
      setListings([]);
      setScrapingProgress(null);
    } finally {
      setIsLoading(false);
      setScrapingProgress(null);
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'מיזוג': <Wind className="h-4 w-4" />,
      'מיזוג מרכזי': <Wind className="h-4 w-4" />,
      'חניה': <Car className="h-4 w-4" />,
      '2 חניות': <Car className="h-4 w-4" />,
      'מעלית': <Building className="h-4 w-4" />,
      'אינטרנט': <Wifi className="h-4 w-4" />,
      'ממ"ד': <Shield className="h-4 w-4" />,
    };
    return iconMap[amenity] || <Home className="h-4 w-4" />;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            חיפוש נכסים במדלן
          </CardTitle>
          <CardDescription>
            הזן כתובת URL של דף חיפוש במדלן לגירוד נתונים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.madlan.co.il/for-rent/תל-אביב-יפו-ישראל"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              className="flex-1"
              dir="ltr"
            />
            <Button 
              onClick={handleScrape}
              disabled={isLoading || !searchUrl}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מחפש...
                </>
              ) : (
                'חפש נכסים'
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="private-only"
              checked={isPrivateOnly}
              onCheckedChange={(checked) => setIsPrivateOnly(checked as boolean)}
            />
            <Label htmlFor="private-only" className="text-sm">
              חיפוש עסקאות פרטיות בלבד
            </Label>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>דוגמאות לחיפוש:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => setSearchUrl('https://www.madlan.co.il/for-rent/תל-אביב-יפו-ישראל')}
            >
              השכרה בתל אביב
            </Button>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => setSearchUrl('https://www.madlan.co.il/for-rent/ירושלים-ישראל')}
            >
              השכרה בירושלים
            </Button>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => setSearchUrl('https://www.madlan.co.il/for-rent/חיפה-ישראל')}
            >
              השכרה בחיפה
            </Button>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => setSearchUrl('https://www.madlan.co.il/for-rent/רחובות-ישראל')}
            >
              השכרה ברחובות
            </Button>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => {
                setSearchUrl('https://www.madlan.co.il/for-rent/חיפה-ישראל');
                setIsPrivateOnly(true);
              }}
            >
              עסקאות פרטיות בחיפה
            </Button>
          </div>
        </CardContent>
      </Card>

      {scrapingProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>מעבד נתונים</AlertTitle>
          <AlertDescription>{scrapingProgress}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {listings.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="results">
                תוצאות ({listings.length})
              </TabsTrigger>
              <TabsTrigger value="insights">
                תובנות
              </TabsTrigger>
            </TabsList>
            
            <Button
              onClick={handleSaveToSupabase}
              disabled={isSaving || listings.length === 0}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  שמור לסופאבייס
                </>
              )}
            </Button>
          </div>
          
          {saveStatus && (
            <Alert variant={saveStatus.success ? 'default' : 'destructive'} className="mb-4">
              {saveStatus.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{saveStatus.success ? 'הצלחה!' : 'שגיאה'}</AlertTitle>
              <AlertDescription>{saveStatus.message}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="results" className="space-y-4">
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <div className="relative h-48 md:h-full bg-gray-100">
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      {listing.isPromoted && (
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          מודעה מקודמת
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{listing.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{listing.address}, {listing.neighborhood}, {listing.city}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-lg">{formatPrice(listing.price)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4 text-blue-600" />
                          <span>{listing.rooms} חדרים</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 text-purple-600" />
                          <span>{listing.area} מ"ר</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-orange-600" />
                          <span>
                            {listing.totalFloors > 0 
                              ? `קומה ${listing.floor} מתוך ${listing.totalFloors}`
                              : listing.floor === 0
                                ? 'קומת קרקע'
                                : listing.floor === -1
                                  ? 'מרתף' 
                                  : listing.floor > 0
                                    ? `קומה ${listing.floor}`
                                    : 'לא צוין'
                            }
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {listing.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {listing.amenities.map((amenity, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            {getAmenityIcon(amenity)}
                            <span>{amenity}</span>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>כניסה: {new Date(listing.entryDate).toLocaleDateString('he-IL')}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{listing.contactName}</span>
                          <span className="text-muted-foreground"> • {listing.contactPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">מחיר ממוצע</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPrice(
                      listings.reduce((acc, l) => acc + l.price, 0) / listings.length
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    לחודש
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">גודל ממוצע</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      listings.reduce((acc, l) => acc + l.area, 0) / listings.length
                    )} מ"ר
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    שטח דירה
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">מחיר למ"ר</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPrice(
                      listings.reduce((acc, l) => acc + (l.price / l.area), 0) / listings.length
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ממוצע חודשי
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">התפלגות לפי סוג נכס</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    listings.reduce((acc, l) => {
                      acc[l.propertyType] = (acc[l.propertyType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">שירותים פופולריים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set(listings.flatMap(l => l.amenities))
                  ).map((amenity) => (
                    <Badge key={amenity} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}