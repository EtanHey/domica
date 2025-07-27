'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PropertyCard } from '@/components/property-card';
import { Save, CheckCircle, Upload, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

// Property interface matching PropertyCard expectations
interface PropertyImage {
  imageUrl: string;
  isPrimary?: boolean | null;
}

interface Property {
  id: string;
  title: string;
  pricePerMonth: string;
  currency?: string | null;
  locationText: string | null;
  bedrooms?: number | null;
  bathrooms?: string | null;
  images?: PropertyImage[];
  duplicateStatus?: string | null;
  duplicateScore?: string | null;
  listingType?: string | null;
  // Additional fields for our scraper
  description?: string;
  amenities?: string[];
  contactPhone?: string;
  floor?: number;
  source?: string;
  sourceUrl?: string;
}

export function FacebookParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [rawPosts, setRawPosts] = useState('');
  const [parsedProperties, setParsedProperties] = useState<Property[]>([]);
  const [error, setError] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const mockProperties: Property[] = [
    {
      id: 'mock-1',
      title: 'דירת 3 חדרים במרכז מודיעין',
      pricePerMonth: '5500',
      currency: '₪',
      locationText: 'מרכז העיר, מודיעין',
      bedrooms: 3,
      bathrooms: '1.5',
      images: [
        {
          imageUrl: '/placeholder-rental.jpg',
          isPrimary: true,
        },
      ],
      duplicateStatus: null,
      duplicateScore: null,
      listingType: 'rent',
      description: 'דירה מקסימה ומרווחת במרכז מודיעין, קרוב לכל המוסדות',
      amenities: ['מעלית', 'חניה', 'מרפסת', 'מזגן'],
      floor: 3,
      source: 'facebook',
      sourceUrl: 'https://www.facebook.com/groups/apartmentsmodiin',
    },
    {
      id: 'mock-2',
      title: 'דירת 4 חדרים בשכונת הפארק',
      pricePerMonth: '7200',
      currency: '₪',
      locationText: 'שכונת הפארק, מודיעין',
      bedrooms: 4,
      bathrooms: '2',
      images: [
        {
          imageUrl: '/placeholder-rental.jpg',
          isPrimary: true,
        },
      ],
      duplicateStatus: null,
      duplicateScore: null,
      listingType: 'rent',
      description: 'דירה חדשה ומשופצת, כניסה מיידית',
      amenities: ['מעלית', 'חניה', 'מרפסת', 'ממ״ד', 'מזגן'],
      floor: 5,
      source: 'facebook',
      sourceUrl: 'https://www.facebook.com/groups/apartmentsmodiin',
    },
  ];

  const handleParsePosts = async () => {
    setError('');
    setIsLoading(true);
    setParsedProperties([]);
    setSavedCount(0);

    try {
      if (!rawPosts.trim()) {
        toast({
          title: '❌ שגיאה',
          description: 'אנא הדבק פוסטים לניתוח',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Call AI parsing API
      const response = await fetch('/api/parse-rental-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posts: rawPosts,
        }),
      });

      const data = await response.json();
      console.log('AI parsing response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse posts');
      }

      if (data.properties && data.properties.length > 0) {
        setParsedProperties(data.properties);
        console.log(`Found ${data.properties.length} properties`);
        toast({
          title: '✅ הצלחה',
          description: `נמצאו ${data.properties.length} דירות`,
        });
      } else {
        toast({
          title: '❌ שגיאה',
          description: 'לא נמצאו דירות להשכרה בטקסט. נסה להדביק פוסטים אחרים.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: '❌ שגיאה',
        description: 'שגיאה בניתוח הטקסט',
        variant: 'destructive',
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMode = () => {
    if (!testMode) return;

    setError('');
    setIsLoading(true);
    setParsedProperties([]);
    setSavedCount(0);

    // Simulate AI processing delay
    setTimeout(() => {
      setParsedProperties(mockProperties);
      setIsLoading(false);
    }, 1000);
  };

  const handleSaveToDatabase = async () => {
    if (selectedProperties.size === 0) return;

    setIsSaving(true);
    setError('');

    try {
      // Filter properties to only save selected ones
      const propertiesToSave = parsedProperties.filter((p) => selectedProperties.has(p.id));

      const response = await fetch('/api/save-facebook-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: propertiesToSave,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save properties');
      }

      setSavedCount(data.count);
      setShowSelectionModal(false);
      
      toast({
        title: '✅ נשמר בהצלחה',
        description: `${data.count} דירות נשמרו במאגר`,
      });

      // Clear properties after successful save
      setTimeout(() => {
        setParsedProperties([]);
        setRawPosts('');
        setSavedCount(0);
        setSelectedProperties(new Set());
      }, 3000);
    } catch (err: any) {
      toast({
        title: '❌ שגיאה בשמירה',
        description: err.message || 'שגיאה בשמירת הנכסים',
        variant: 'destructive',
      });
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSelectionModal = () => {
    // Select all properties by default
    setSelectedProperties(new Set(parsedProperties.map((p) => p.id)));
    setShowSelectionModal(true);
  };

  const togglePropertySelection = (propertyId: string) => {
    const newSelection = new Set(selectedProperties);
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId);
    } else {
      newSelection.add(propertyId);
    }
    setSelectedProperties(newSelection);
  };

  return (
    <>
      <Card>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="facebook-parser" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col items-start text-left">
                <h3 className="text-lg font-semibold">ניתוח פוסטים מפייסבוק עם AI</h3>
                <p className="text-muted-foreground text-sm">העתק פוסטים והמערכת תנתח אותם באמצעות Claude AI</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>איך זה עובד:</strong> העתק פוסטים מקבוצות פייסבוק (Ctrl+C) והדבק למטה.
                    <br />
                    <strong>Claude AI</strong> ינתח את הטקסט ויחלץ מחיר, מספר חדרים, מיקום ופרטים נוספים.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="rounded"
                    />
                    מצב בדיקה (נתונים לדוגמה)
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">דוגמאות לפוסטים:</span>
                    <span className="text-muted-foreground text-xs">לחץ להעתקה</span>
                  </div>

                  <div
                    className={`group bg-muted/50 rounded-lg border p-3 transition-all ${
                      isLoading
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-muted/70 cursor-pointer hover:border-green-500/50'
                    }`}
                    onClick={() =>
                      !isLoading &&
                      setRawPosts(`שלום לכולם 🏠
דירת 3 חדרים להשכרה במודיעין
ברחוב יהלום, שכונת הפארק
קומה 2 מתוך 4, עם מעלית
מרפסת שמש גדולה, 3 כיווני אוויר
מטבח משופץ, מזגנים בכל החדרים
5,800 ש״ח כולל ארנונה
כניסה 1.2.25
לפרטים: 052-1234567`)
                    }
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                      <span className="text-xs font-medium">פוסט דוגמה - דירת 3 חדרים</span>
                    </div>
                    <code className="text-muted-foreground block font-mono text-xs whitespace-pre-wrap" dir="rtl">
                      שלום לכולם 🏠
                      דירת 3 חדרים להשכרה במודיעין...
                    </code>
                  </div>

                  <div
                    className={`group bg-muted/50 rounded-lg border p-3 transition-all ${
                      isLoading
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-muted/70 cursor-pointer hover:border-purple-500/50'
                    }`}
                    onClick={() =>
                      !isLoading &&
                      setRawPosts(`להשכרה דחוף!!
4 חד׳ במרכז מודיעין
90 מ״ר + מרפסת 12 מ״ר
קומה 3/5 עם מעלית + חניה
ממ״ד, 2 שירותים
6500 ש״ח
פנוי מיידי
רק רציניים 054-9876543`)
                    }
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
                      <span className="text-xs font-medium">פוסט דוגמה - דירת 4 חדרים</span>
                    </div>
                    <code className="text-muted-foreground block font-mono text-xs whitespace-pre-wrap" dir="rtl">
                      להשכרה דחוף!!
                      4 חד׳ במרכז מודיעין...
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook-posts">הדבק פוסטים מפייסבוק</Label>
                  <div className="relative">
                    <FileText className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                    <Textarea
                      id="facebook-posts"
                      placeholder="הדבק כאן פוסטים של דירות להשכרה מפייסבוק..."
                      value={rawPosts}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setRawPosts(e.target.value)
                      }
                      className="min-h-[200px] pl-8"
                      dir="rtl"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  onClick={testMode ? handleTestMode : handleParsePosts}
                  disabled={isLoading || (!rawPosts.trim() && !testMode)}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {testMode ? 'טוען נתונים לדוגמה...' : 'מנתח פוסטים עם AI...'}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {testMode ? 'הצג נתונים לדוגמה' : 'נתח פוסטים עם AI'}
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {parsedProperties.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">נמצאו {parsedProperties.length} דירות לניתוח</h2>
            <Button
              onClick={handleOpenSelectionModal}
              disabled={savedCount > 0}
              variant={savedCount > 0 ? 'outline' : 'default'}
              className="gap-2"
            >
              {savedCount > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  נשמרו {savedCount} דירות
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  בחר דירות לשמירה
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {parsedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={showSelectionModal} onOpenChange={setShowSelectionModal}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>בחר דירות לשמירה</DialogTitle>
            <DialogDescription>
              סמן את הדירות שברצונך לשמור במאגר. {selectedProperties.size} מתוך{' '}
              {parsedProperties.length} נבחרו
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {parsedProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-start space-x-3 space-x-reverse rounded-lg border p-4"
                >
                  <Checkbox
                    id={property.id}
                    checked={selectedProperties.has(property.id)}
                    onCheckedChange={() => togglePropertySelection(property.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={property.id} className="cursor-pointer">
                      <div className="font-medium">{property.title}</div>
                      <div className="text-muted-foreground text-sm">
                        {property.pricePerMonth} ₪ לחודש
                      </div>
                      <div className="text-muted-foreground text-sm">{property.locationText}</div>
                      {property.amenities && property.amenities.length > 0 && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {property.amenities.join(', ')}
                        </div>
                      )}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectionModal(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSaveToDatabase}
              disabled={selectedProperties.size === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="ml-2 h-4 w-4" />
                  שמור {selectedProperties.size} דירות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
