'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Wand2 } from 'lucide-react';

interface ExtractedPost {
  text: string;
  author?: string;
  price?: string;
  location?: string;
  rooms?: string;
  phone?: string;
}

export function FacebookSmartPaste() {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedPosts, setExtractedPosts] = useState<ExtractedPost[]>([]);
  const { toast } = useToast();

  // Smart parser that understands Facebook post structure
  const parseSmartPaste = (text: string): ExtractedPost[] => {
    const posts: ExtractedPost[] = [];

    // Split by common post separators
    const potentialPosts = text.split(/\n{3,}|_{10,}|-{10,}|={10,}/);

    potentialPosts.forEach((chunk) => {
      // Skip very short chunks
      if (chunk.trim().length < 50) return;

      // Look for author pattern (name followed by time indicator)
      const authorMatch = chunk.match(
        /^([^\n]+?)(?:\s+·\s+|\s+•\s+|\n)(?:\d+[hdwm]|\d+\s*(?:hours?|days?|weeks?))/
      );
      const author = authorMatch ? authorMatch[1].trim() : undefined;

      // Extract price
      const priceMatch = chunk.match(
        /(?:₪|ש"ח|שח)\s*(\d{1,2},?\d{3})|(\d{1,2},?\d{3})\s*(?:₪|ש"ח|שח)/
      );
      const price = priceMatch ? priceMatch[1] || priceMatch[2] : undefined;

      // Extract rooms
      const roomsMatch = chunk.match(/(\d+(?:\.\d+)?)\s*(?:חדרים|חד'|חדר)/);
      const rooms = roomsMatch ? roomsMatch[1] : undefined;

      // Extract phone
      const phoneMatch = chunk.match(/05\d[-\s]?\d{7}|05\d{8}/);
      const phone = phoneMatch ? phoneMatch[0] : undefined;

      // Extract location (cities and neighborhoods)
      const locationKeywords = [
        'מודיעין',
        'ירושלים',
        'תל אביב',
        'חיפה',
        'באר שבע',
        'רמת גן',
        'רחוב',
        'שכונת',
        'ליד',
        'קרוב',
        'באזור',
        'ב',
      ];

      let location = '';
      const lines = chunk.split('\n');
      lines.forEach((line) => {
        if (locationKeywords.some((keyword) => line.includes(keyword))) {
          location = line.trim();
          return;
        }
      });

      // If it looks like a rental post, add it
      if (price || rooms || chunk.includes('להשכרה') || chunk.includes('השכרה')) {
        posts.push({
          text: chunk.trim(),
          author: author?.replace(/[\u200B-\u200D\uFEFF]/g, ''), // Remove zero-width chars
          price,
          rooms,
          phone,
          location,
        });
      }
    });

    return posts;
  };

  // Handle paste event
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();

    const text = e.clipboardData.getData('text');
    setRawText(text);

    // Auto-process if it looks like Facebook content
    if (text.includes('·') || text.includes('להשכרה') || text.match(/\d+[hdwm]/)) {
      toast({
        title: '🔍 זוהה תוכן מפייסבוק',
        description: 'מעבד אוטומטית...',
      });

      setTimeout(() => {
        processText(text);
      }, 500);
    }
  };

  const processText = (text: string) => {
    setIsProcessing(true);

    try {
      const posts = parseSmartPaste(text);
      setExtractedPosts(posts);

      toast({
        title: '✅ עיבוד הושלם',
        description: `נמצאו ${posts.length} פוסטים`,
      });
    } catch (error) {
      toast({
        title: '❌ שגיאה',
        description: 'שגיאה בעיבוד הטקסט',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-lg font-semibold">הדבקה חכמה מפייסבוק</h3>
          <Alert>
            <AlertDescription>
              <strong>טיפ:</strong> סמן פוסטים בפייסבוק עם העכבר (כולל שם המפרסם והזמן) והדבק כאן.
              המערכת תזהה אוטומטית את המבנה ותחלץ את המידע.
            </AlertDescription>
          </Alert>
        </div>

        <div>
          <Textarea
            placeholder="הדבק כאן פוסטים מפייסבוק (Ctrl+V)..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onPaste={handlePaste}
            className="min-h-[200px]"
            dir="auto"
          />
        </div>

        <Button
          onClick={() => processText(rawText)}
          disabled={!rawText.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              מעבד...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              עבד טקסט חכם
            </>
          )}
        </Button>

        {extractedPosts.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium">פוסטים שזוהו: {extractedPosts.length}</h4>
            {extractedPosts.map((post, index) => (
              <Card key={index} className="space-y-2 p-4">
                {post.author && (
                  <p className="text-muted-foreground text-sm">מפרסם: {post.author}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {post.price && <p>💰 מחיר: ₪{post.price}</p>}
                  {post.rooms && <p>🏠 חדרים: {post.rooms}</p>}
                  {post.phone && <p>📱 טלפון: {post.phone}</p>}
                  {post.location && <p>📍 מיקום: {post.location}</p>}
                </div>
                <details className="text-sm">
                  <summary className="text-muted-foreground cursor-pointer">הצג טקסט מלא</summary>
                  <p className="mt-2 text-xs whitespace-pre-wrap">{post.text}</p>
                </details>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
