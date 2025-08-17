'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PropertyCard } from '@/components/property-card';
import { Save, CheckCircle, Upload, Loader2, FileText, ImageIcon, X } from 'lucide-react';
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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [useGoogleAI, setUseGoogleAI] = useState(true); // Use Google Document AI by default
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

  const compressImage = async (dataUrl: string, maxSizeMB: number = 3): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate size reduction if needed - use larger dimension for better text clarity
        const maxDimension = 3000; // Increased for better text recognition
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality for better text recognition
        let quality = 0.95;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality minimally to preserve text clarity
        while (compressedDataUrl.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.7) {
          quality -= 0.05;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressedDataUrl);
      };
      img.src = dataUrl;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

    for (const file of files) {
      const isSupported = supportedTypes.some(type => 
        file.type === type || file.type === type.replace('jpg', 'jpeg')
      );
      
      if (isSupported) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          
          // For PDFs or when using Google AI, no compression needed
          if (file.type === 'application/pdf' || useGoogleAI) {
            setUploadedImages((prev) => [...prev, dataUrl]);
          } else {
            // Check size and compress if needed for Claude
            const sizeInMB = dataUrl.length / (1024 * 1024);
            if (sizeInMB > 3) {
              toast({
                title: '🔄 דחיסת תמונה',
                description: 'התמונה גדולה מדי, מבצע דחיסה...',
              });
              
              try {
                const compressedDataUrl = await compressImage(dataUrl, 3);
                setUploadedImages((prev) => [...prev, compressedDataUrl]);
                toast({
                  title: '✅ הצלחה',
                  description: 'התמונה נדחסה והועלתה בהצלחה',
                });
              } catch (error) {
                toast({
                  title: '❌ שגיאה',
                  description: 'שגיאה בדחיסת התמונה',
                  variant: 'destructive',
                });
              }
            } else {
              setUploadedImages((prev) => [...prev, dataUrl]);
            }
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: '❌ שגיאה',
          description: 'נא להעלות קבצי תמונה (JPG, PNG, WEBP, GIF) או PDF בלבד',
          variant: 'destructive',
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParsePosts = async () => {
    setError('');
    setIsLoading(true);
    setParsedProperties([]);
    setSavedCount(0);

    try {
      if (inputMode === 'text' && !rawPosts.trim()) {
        toast({
          title: '❌ שגיאה',
          description: 'אנא הדבק פוסטים לניתוח',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (inputMode === 'image' && uploadedImages.length === 0) {
        toast({
          title: '❌ שגיאה',
          description: 'אנא העלה תמונות לניתוח',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Call AI parsing API
      const apiEndpoint = inputMode === 'image' && useGoogleAI 
        ? '/api/parse-rental-posts-google' 
        : '/api/parse-rental-posts';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posts: inputMode === 'text' ? rawPosts : undefined,
          images: inputMode === 'image' && !useGoogleAI ? uploadedImages : undefined,
          documents: inputMode === 'image' && useGoogleAI ? uploadedImages : undefined,
          mode: inputMode,
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

      // Show appropriate message based on results
      if (data.duplicates && data.duplicates.length > 0) {
        console.log('Duplicates found:', data.duplicates);
      }
      
      if (data.errors && data.errors.length > 0) {
        console.error('Save errors:', data.errors);
      }
      
      // Choose toast variant based on outcome
      let toastVariant: 'default' | 'destructive' = 'default';
      let toastTitle = '✅ הפעולה הושלמה';
      
      if (data.count === 0 && data.duplicatesFound > 0) {
        toastTitle = '⚠️ לא נוספו דירות חדשות';
      } else if (data.errors && data.errors.length > 0) {
        toastTitle = '⚠️ שמירה חלקית';
      }
      
      toast({
        title: toastTitle,
        description: data.message,
        variant: toastVariant,
      });

      // Clear properties after save (even if partial)
      setTimeout(() => {
        setParsedProperties([]);
        setRawPosts('');
        setSavedCount(0);
        setSelectedProperties(new Set());
        setUploadedImages([]);
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
                <p className="text-muted-foreground text-sm">
                  העתק פוסטים והמערכת תנתח אותם באמצעות Claude AI
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>איך זה עובד:</strong> 
                    <br />
                    <strong>לטקסט:</strong> העתק פוסטים מקבוצות פייסבוק (Ctrl+C) והדבק למטה
                    <br />
                    <strong>לתמונות/PDF:</strong> 
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>פתח את קבוצת הפייסבוק</li>
                      <li>השתמש בסקריפט להרחבת "עוד" (ראה הוראות למטה)</li>
                      <li>צלם מסך או שמור כ-PDF</li>
                      <li>העלה את הקובץ כאן</li>
                    </ol>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium hover:text-blue-600">
                        📖 הוראות להרחבת פוסטים בפייסבוק
                      </summary>
                      <div className="mt-2 text-sm space-y-2 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                        <p><strong>שיטה מהירה:</strong></p>
                        <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          document.querySelectorAll('div[role="button"]').forEach(b =&gt; {'{'}
                            if (b.textContent?.match(/עוד|See more/)) b.click();
                          {'}'});
                        </code>
                        <p className="text-xs mt-2">
                          1. לחץ F12 בדפדפן → Console
                          <br />
                          2. הדבק את הקוד ולחץ Enter
                          <br />
                          3. חכה שכל הפוסטים יורחבו
                          <br />
                          4. צלם מסך (F12 → Ctrl+Shift+P → "screenshot")
                        </p>
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant={inputMode === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInputMode('text')}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      טקסט
                    </Button>
                    <Button
                      variant={inputMode === 'image' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInputMode('image')}
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      תמונות
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="rounded"
                    />
                    מצב בדיקה
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
                    <code
                      className="text-muted-foreground block font-mono text-xs whitespace-pre-wrap"
                      dir="rtl"
                    >
                      שלום לכולם 🏠 דירת 3 חדרים להשכרה במודיעין...
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
                    <code
                      className="text-muted-foreground block font-mono text-xs whitespace-pre-wrap"
                      dir="rtl"
                    >
                      להשכרה דחוף!! 4 חד׳ במרכז מודיעין...
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  {inputMode === 'text' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="image-upload">העלה תמונות או PDF</Label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={useGoogleAI}
                            onChange={(e) => setUseGoogleAI(e.target.checked)}
                            className="rounded"
                          />
                          השתמש ב-Google AI (מומלץ ל-PDF)
                        </label>
                      </div>
                      <div className="space-y-4">
                        <div className="rounded-lg border-2 border-dashed p-6 text-center">
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,application/pdf"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="image-upload"
                            className="flex cursor-pointer flex-col items-center gap-2"
                          >
                            <ImageIcon className="text-muted-foreground h-8 w-8" />
                            <span className="text-muted-foreground text-sm">
                              לחץ להעלאת תמונות או PDF
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {useGoogleAI 
                                ? 'PDF, PNG, JPG, WEBP, GIF • Google AI לזיהוי טקסט מדויק'
                                : 'PNG, JPG, WEBP, GIF • תמונות גדולות ידחסו אוטומטית'}
                            </span>
                          </label>
                        </div>

                        {uploadedImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-4">
                            {uploadedImages.map((image, index) => (
                              <div key={index} className="group relative">
                                <img
                                  src={image}
                                  alt={`Upload ${index + 1}`}
                                  className="h-32 w-full rounded-lg border object-cover"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Button
                  onClick={testMode ? handleTestMode : handleParsePosts}
                  disabled={
                    isLoading ||
                    (!testMode &&
                      ((inputMode === 'text' && !rawPosts.trim()) ||
                        (inputMode === 'image' && uploadedImages.length === 0)))
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {testMode
                        ? 'טוען נתונים לדוגמה...'
                        : `מנתח ${inputMode === 'image' ? 'תמונות' : 'פוסטים'} עם AI...`}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {testMode
                        ? 'הצג נתונים לדוגמה'
                        : `נתח ${inputMode === 'image' ? 'תמונות' : 'פוסטים'} עם AI`}
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
