'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
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
  X,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  Sparkles,
  Trophy,
  Star,
  Eye,
  Download
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

interface MadlanResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MadlanListing[];
  isLoading?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  saveStatus?: SaveStatus | null;
  searchUrl?: string;
  scrapingStats?: {
    totalFound: number;
    processed: number;
    saved: number;
  };
}

export function MadlanResultsModal({
  open,
  onOpenChange,
  listings,
  isLoading = false,
  onSave,
  isSaving = false,
  saveStatus,
  searchUrl,
  scrapingStats
}: MadlanResultsModalProps) {
  const [activeTab, setActiveTab] = useState('results');
  const [selectedListing, setSelectedListing] = useState<MadlanListing | null>(null);

  const getAmenityIcon = (amenity: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'מיזוג': <Wind className="h-3 w-3" />,
      'מיזוג מרכזי': <Wind className="h-3 w-3" />,
      'חניה': <Car className="h-3 w-3" />,
      '2 חניות': <Car className="h-3 w-3" />,
      'מעלית': <Building className="h-3 w-3" />,
      'אינטרנט': <Wifi className="h-3 w-3" />,
      'ממ"ד': <Shield className="h-3 w-3" />,
    };
    return iconMap[amenity] || <Home className="h-3 w-3" />;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const averagePrice = listings.length > 0 ? 
    listings.reduce((acc, l) => acc + l.price, 0) / listings.length : 0;
  
  const averageArea = listings.length > 0 ? 
    listings.reduce((acc, l) => acc + l.area, 0) / listings.length : 0;

  const pricePerSqm = listings.length > 0 ? 
    listings.reduce((acc, l) => acc + (l.price / l.area), 0) / listings.length : 0;

  const getBestDeal = () => {
    if (listings.length === 0) return null;
    return listings.reduce((best, current) => 
      (current.price / current.area) < (best.price / best.area) ? current : best
    );
  };

  const bestDeal = getBestDeal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="h-6 w-6 text-green-600 animate-pulse" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-ping" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  תוצאות מדלן
                  {listings.length > 0 && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {listings.length} נכסים
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      סורק נכסים...
                    </div>
                  ) : (
                    `נמצאו ${listings.length} נכסים בהצלחה`
                  )}
                </DialogDescription>
              </div>
            </div>
            
            {!isLoading && listings.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      שמור הכל
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar for Loading */}
          {isLoading && scrapingStats && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>מעבד נכסים...</span>
                <span>{scrapingStats.processed}/{scrapingStats.totalFound}</span>
              </div>
              <Progress 
                value={(scrapingStats.processed / scrapingStats.totalFound) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Save Status */}
          {saveStatus && (
            <Alert 
              variant={saveStatus.success ? 'default' : 'destructive'} 
              className="mt-3"
            >
              {saveStatus.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {saveStatus.success ? 'נשמר בהצלחה!' : 'שגיאה בשמירה'}
              </AlertTitle>
              <AlertDescription>
                {saveStatus.success && saveStatus.savedCount !== undefined ? (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>חדשים: {saveStatus.savedCount}</span>
                    {saveStatus.updatedCount && saveStatus.updatedCount > 0 && (
                      <span>עודכנו: {saveStatus.updatedCount}</span>
                    )}
                    {saveStatus.skippedDuplicates && saveStatus.skippedDuplicates > 0 && (
                      <span>כפולים: {saveStatus.skippedDuplicates}</span>
                    )}
                  </div>
                ) : (
                  saveStatus.message
                )}
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
                  <div className="absolute inset-0 rounded-full border-2 border-green-200 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">מחפש נכסים מעולים...</h3>
                  <p className="text-muted-foreground">אנא המתן, זה לוקח רק כמה שניות</p>
                </div>
              </div>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Home className="h-16 w-16 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">לא נמצאו נכסים</h3>
                  <p className="text-muted-foreground">נסה לשנות את החיפוש או לנסות אזור אחר</p>
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
                <TabsTrigger value="results" className="gap-2">
                  <Eye className="h-4 w-4" />
                  נכסים ({listings.length})
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  סטטיסטיקות
                </TabsTrigger>
                <TabsTrigger value="best" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  המיטב
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden px-4 pb-4">
                <TabsContent value="results" className="h-full mt-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4">
                      {listings.map((listing, index) => (
                        <Card 
                          key={listing.id} 
                          className="overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer"
                          onClick={() => setSelectedListing(listing)}
                        >
                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="relative">
                              <div className="relative h-32 md:h-full bg-gray-100 overflow-hidden rounded-l-lg">
                                {listing.images[0] ? (
                                  <img
                                    src={listing.images[0]}
                                    alt={listing.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Home className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                {listing.isPromoted && (
                                  <Badge className="absolute top-2 right-2 bg-orange-500 border-orange-600">
                                    <Star className="h-3 w-3 mr-1" />
                                    מקודם
                                  </Badge>
                                )}
                                <div className="absolute top-2 left-2">
                                  <Badge variant="secondary" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="md:col-span-3 p-4">
                              <div className="space-y-3">
                                <div>
                                  <h3 className="text-lg font-semibold mb-1 group-hover:text-green-600 transition-colors line-clamp-1">
                                    {listing.title}
                                  </h3>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span className="line-clamp-1">
                                      {listing.address}, {listing.neighborhood}, {listing.city}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3 text-sm">
                                  <div className="flex items-center gap-1 font-bold text-green-600">
                                    <DollarSign className="h-4 w-4" />
                                    <span>{formatPrice(listing.price)}</span>
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
                                    <TrendingUp className="h-4 w-4 text-orange-600" />
                                    <span>{formatPrice(listing.price / listing.area)}/מ"ר</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {listing.amenities.slice(0, 4).map((amenity, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                                      {getAmenityIcon(amenity)}
                                      <span>{amenity}</span>
                                    </Badge>
                                  ))}
                                  {listing.amenities.length > 4 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{listing.amenities.length - 4}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>כניסה: {new Date(listing.entryDate).toLocaleDateString('he-IL')}</span>
                                  </div>
                                  <div className="font-medium text-right">
                                    {listing.contactName}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="insights" className="h-full mt-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-6 pr-4">
                      {/* Key Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                          <CardContent className="p-4 text-center">
                            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-700">
                              {formatPrice(averagePrice)}
                            </div>
                            <p className="text-sm text-green-600">מחיר ממוצע</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                          <CardContent className="p-4 text-center">
                            <Square className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-700">
                              {Math.round(averageArea)} מ"ר
                            </div>
                            <p className="text-sm text-blue-600">שטח ממוצע</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                          <CardContent className="p-4 text-center">
                            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-700">
                              {formatPrice(pricePerSqm)}
                            </div>
                            <p className="text-sm text-purple-600">מחיר למ"ר</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Property Type Distribution */}
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            התפלגות לפי סוג נכס
                          </h3>
                          <div className="space-y-3">
                            {Object.entries(
                              listings.reduce((acc, l) => {
                                acc[l.propertyType] = (acc[l.propertyType] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{type}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full" 
                                      style={{width: `${(count / listings.length) * 100}%`}}
                                    />
                                  </div>
                                  <Badge variant="secondary">{count}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Popular Amenities */}
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            שירותים פופולריים
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(
                              new Set(listings.flatMap(l => l.amenities))
                            ).map((amenity) => {
                              const count = listings.filter(l => l.amenities.includes(amenity)).length;
                              const percentage = (count / listings.length) * 100;
                              return (
                                <Badge 
                                  key={amenity} 
                                  variant="outline" 
                                  className="flex items-center gap-2"
                                >
                                  {getAmenityIcon(amenity)}
                                  <span>{amenity}</span>
                                  <span className="text-xs bg-gray-100 px-1 rounded">
                                    {Math.round(percentage)}%
                                  </span>
                                </Badge>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="best" className="h-full mt-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-6 pr-4">
                      {bestDeal && (
                        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-200">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Trophy className="h-6 w-6 text-orange-600" />
                              <h3 className="text-lg font-bold text-orange-800">העסקה הטובה ביותר</h3>
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                {formatPrice(bestDeal.price / bestDeal.area)}/מ"ר
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <h4 className="font-semibold text-orange-900">{bestDeal.title}</h4>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  {formatPrice(bestDeal.price)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Square className="h-4 w-4 text-blue-600" />
                                  {bestDeal.area} מ"ר
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bed className="h-4 w-4 text-purple-600" />
                                  {bestDeal.rooms} חדרים
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {bestDeal.address}, {bestDeal.city}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Price Range Analysis */}
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-4">ניתוח טווח מחירים</h3>
                          <div className="space-y-4">
                            {['זול', 'בינוני', 'יקר'].map((category, index) => {
                              const ranges = [
                                listings.filter(l => l.price < averagePrice * 0.8),
                                listings.filter(l => l.price >= averagePrice * 0.8 && l.price <= averagePrice * 1.2),
                                listings.filter(l => l.price > averagePrice * 1.2)
                              ];
                              const count = ranges[index].length;
                              const percentage = (count / listings.length) * 100;
                              
                              return (
                                <div key={category} className="flex items-center justify-between">
                                  <span className="font-medium">{category}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          index === 0 ? 'bg-green-500' : 
                                          index === 1 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{width: `${percentage}%`}}
                                      />
                                    </div>
                                    <span className="text-sm w-12 text-right">
                                      {Math.round(percentage)}%
                                    </span>
                                    <Badge variant="outline" className="w-8 justify-center">
                                      {count}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}