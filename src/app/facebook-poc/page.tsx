'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyCard } from '@/components/property-card';
import { Save, CheckCircle } from 'lucide-react';
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
import { Loader2, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FacebookPocPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [rawPosts, setRawPosts] = useState('');
  const [parsedProperties, setParsedProperties] = useState<Property[]>([]);
  const [error, setError] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

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

  const parseHebrewRentalPost = (postText: string, index: number): Property | null => {
    try {
      // Clean the text - remove extra whitespace and normalize
      const cleanText = postText.trim().replace(/\s+/g, ' ');

      // Extract price - more flexible patterns
      const pricePatterns = [
        /₪\s*(\d+(?:,\d+)?)/,
        /(\d+(?:,\d+)?)\s*₪/,
        /(\d+(?:,\d+)?)\s*(?:ש[״']ח|שקל)/,
        /מחיר:?\s*(\d+(?:,\d+)?)/,
      ];

      let price = 0;
      for (const pattern of pricePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          price = parseInt(match[1].replace(',', ''));
          break;
        }
      }

      // Extract rooms - more patterns
      const roomsPatterns = [
        /(\d+(?:\.\d+)?)\s*חדרים/,
        /דירת\s*(\d+(?:\.\d+)?)\s*חד/,
        /(\d+(?:\.\d+)?)\s*חד'/,
        /(\d+)\s+rooms?/i,
      ];

      let rooms = 0;
      for (const pattern of roomsPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          rooms = parseFloat(match[1]);
          break;
        }
      }

      // Expanded city list including Modiin
      const cities = [
        'מודיעין',
        'מודיעין מכבים רעות',
        'מודיעין עילית',
        'תל אביב',
        'ירושלים',
        'חיפה',
        'רמת גן',
        'גבעתיים',
        'הרצליה',
        'רעננה',
        'נתניה',
        'אשדוד',
        'באר שבע',
        'פתח תקווה',
        'ראשון לציון',
        'חולון',
        'בת ים',
      ];

      let city = 'מודיעין'; // default for Modiin group
      for (const c of cities) {
        if (cleanText.includes(c)) {
          city = c;
          break;
        }
      }

      // Extract neighborhood - more patterns
      const neighborhoodPatterns = [
        /(?:שכונ[הת]|רובע)\s+([^\s,]+)/,
        /ב([^\s,]+)\s*(?:ליד|קרוב)/,
        /רחוב\s+([^\s,]+)/,
      ];

      let neighborhood = 'מרכז';
      for (const pattern of neighborhoodPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          neighborhood = match[1];
          break;
        }
      }

      // Extract floor
      const floorMatch = cleanText.match(/קומה\s*(\d+)/);
      const floor = floorMatch ? parseInt(floorMatch[1]) : 1;

      // More amenities
      const amenities = [];
      const amenityChecks = {
        מעלית: ['מעלית', 'elevator'],
        חניה: ['חניה', 'חנייה', 'parking'],
        מרפסת: ['מרפסת', 'מרפסות', 'balcony'],
        'ממ״ד': ['ממ"ד', 'ממד', 'מרחב מוגן'],
        מזגן: ['מזגן', 'מיזוג', 'a/c', 'air condition'],
        'ריהוט מלא': ['מרוהט', 'ריהוט', 'furnished'],
        מחסן: ['מחסן', 'storage'],
        'דוד שמש': ['דוד שמש', 'בוילר'],
      };

      for (const [amenity, keywords] of Object.entries(amenityChecks)) {
        if (keywords.some((keyword) => cleanText.toLowerCase().includes(keyword))) {
          amenities.push(amenity);
        }
      }

      // Extract contact - more patterns
      const phonePatterns = [/05\d{1,2}[-\s]?\d{7}/, /05\d{8}/, /\+972\s?5\d{1,2}[-\s]?\d{7}/];

      let contactPhone;
      for (const pattern of phonePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          contactPhone = match[0];
          break;
        }
      }

      // Only create property if we have at least price OR rooms
      if (price === 0 && rooms === 0) {
        return null;
      }

      // Generate a property matching PropertyCard expectations
      const property: Property = {
        id: `fb-${Date.now()}-${index}`,
        title: rooms > 0 ? `דירת ${rooms} חדרים ב${neighborhood}, ${city}` : `דירה להשכרה ב${city}`,
        pricePerMonth: price.toString(),
        currency: '₪',
        locationText: `${neighborhood}, ${city}`,
        bedrooms: rooms || null,
        bathrooms: null,
        images: [
          {
            imageUrl: '/placeholder-rental.jpg',
            isPrimary: true,
          },
        ],
        duplicateStatus: null,
        duplicateScore: null,
        listingType: 'rent',
        // Additional fields
        description: cleanText.slice(0, 300) + (cleanText.length > 300 ? '...' : ''),
        amenities,
        contactPhone,
        floor,
        source: 'facebook',
        sourceUrl: 'https://www.facebook.com/groups/apartmentsmodiin',
      };

      return property;
    } catch (err) {
      console.error('Error parsing post:', err);
      return null;
    }
  };

  const handleParsePosts = async () => {
    setError('');
    setIsLoading(true);
    setParsedProperties([]);
    setSavedCount(0);

    try {
      if (!rawPosts.trim()) {
        setError('אנא הדבק פוסטים לניתוח');
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
      } else {
        setError('לא נמצאו דירות להשכרה בטקסט. נסה להדביק פוסטים אחרים.');
      }
    } catch (err: any) {
      // Fall back to regex parsing if AI fails
      console.log('AI parsing failed, falling back to regex:', err);

      try {
        // Original regex parsing as fallback
        const posts = rawPosts.split(/\n{2,}|---+|\*{3,}/);
        const properties: Property[] = [];

        posts.forEach((post, index) => {
          if (post.trim().length > 50) {
            const property = parseHebrewRentalPost(post.trim(), index);
            if (property && parseInt(property.pricePerMonth) > 0) {
              properties.push(property);
            }
          }
        });

        if (properties.length > 0) {
          setParsedProperties(properties);
          setError('ניתוח עם AI נכשל, משתמש בניתוח רגיל');
        } else {
          setError('לא נמצאו דירות להשכרה בטקסט. וודא שהטקסט כולל מחיר ומספר חדרים.');
        }
      } catch (fallbackErr) {
        setError('שגיאה בניתוח הטקסט');
        console.error(fallbackErr);
      }
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

      // Clear properties after successful save
      setTimeout(() => {
        setParsedProperties([]);
        setRawPosts('');
        setSavedCount(0);
        setSelectedProperties(new Set());
      }, 3000);
    } catch (err: any) {
      setError(`שגיאה בשמירה: ${err.message}`);
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
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">ניתוח פוסטים מפייסבוק עם AI</CardTitle>
          <CardDescription>
            העתק פוסטים של דירות להשכרה מפייסבוק, והמערכת תנתח אותם באמצעות Claude AI
          </CardDescription>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>איך זה עובד:</strong> העתק פוסטים מקבוצות פייסבוק (Ctrl+C) והדבק למטה.
              <br />
              <strong>Claude AI</strong> ינתח את הטקסט ויחלץ מחיר, מספר חדרים, מיקום ופרטים נוספים.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">הדבק פוסטים מפייסבוק</label>
              <Textarea
                placeholder="הדבק כאן פוסטים של דירות להשכרה מפייסבוק...

דוגמה:
דוגמה לפוסטים מפייסבוק:

שלום לכולם 🏠
דירת 3 חדרים להשכרה במודיעין
ברחוב יהלום, שכונת הפארק
קומה 2 מתוך 4, עם מעלית
מרפסת שמש גדולה, 3 כיווני אוויר
מטבח משופץ, מזגנים בכל החדרים
5,800 ש״ח כולל ארנונה
כניסה 1.2.25
לפרטים: 052-1234567

---

להשכרה דחוף!!
4 חד׳ במרכז מודיעין
90 מ״ר + מרפסת 12 מ״ר
קומה 3/5 עם מעלית + חניה
ממ״ד, 2 שירותים
6500 ש״ח
פנוי מיידי
רק רציניים 054-9876543"
                value={rawPosts}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRawPosts(e.target.value)
                }
                className="min-h-[200px]"
                dir="rtl"
              />
              <Button
                onClick={testMode ? handleTestMode : handleParsePosts}
                disabled={isLoading || (!rawPosts.trim() && !testMode)}
                className="mt-3 w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    {testMode ? 'טוען נתונים לדוגמה...' : 'מנתח פוסטים עם AI...'}
                  </>
                ) : (
                  <>
                    <Upload className="ml-2 h-4 w-4" />
                    {testMode ? 'הצג נתונים לדוגמה' : 'נתח פוסטים עם AI'}
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedProperties.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">נמצאו {parsedProperties.length} דירות</h2>
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
    </div>
  );
}
