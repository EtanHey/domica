'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FacebookTemplateHelper() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    price: '',
    rooms: '',
    city: '',
    neighborhood: '',
    street: '',
    floor: '',
    size: '',
    description: '',
    amenities: '',
    phone: '',
    available: ''
  });

  const template = `📋 תבנית להעתקת מודעה מפייסבוק:

🏠 מספר חדרים: [מספר]
💰 מחיר: ₪[מחיר]
📍 עיר: [עיר]
📍 שכונה: [שכונה]
📍 רחוב: [רחוב]
🏢 קומה: [קומה]
📐 גודל: [מ"ר]
📅 כניסה: [תאריך]
📱 טלפון: [טלפון]

🏡 תיאור:
[תיאור כללי]

✨ מה יש בדירה:
[רשימת מתקנים מופרדת בפסיקים]

---
העתק תבנית זו, מלא את הפרטים מהמודעה בפייסבוק, והדבק בחזרה באפליקציה`;

  const generateFilledTemplate = () => {
    return `🏠 מספר חדרים: ${formData.rooms}
💰 מחיר: ₪${formData.price}
📍 עיר: ${formData.city}
📍 שכונה: ${formData.neighborhood}
📍 רחוב: ${formData.street}
🏢 קומה: ${formData.floor}
📐 גודל: ${formData.size} מ"ר
📅 כניסה: ${formData.available}
📱 טלפון: ${formData.phone}

🏡 תיאור:
${formData.description}

✨ מה יש בדירה:
${formData.amenities}`;
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(template);
    toast({
      title: '✅ הועתק',
      description: 'התבנית הועתקה. הדבק בפייסבוק ומלא את הפרטים',
    });
  };

  const parseFilledTemplate = (text: string) => {
    const extractValue = (pattern: RegExp) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : '';
    };

    setFormData({
      rooms: extractValue(/מספר חדרים:\s*(.+)/),
      price: extractValue(/מחיר:\s*₪?\s*(.+)/),
      city: extractValue(/עיר:\s*(.+)/),
      neighborhood: extractValue(/שכונה:\s*(.+)/),
      street: extractValue(/רחוב:\s*(.+)/),
      floor: extractValue(/קומה:\s*(.+)/),
      size: extractValue(/גודל:\s*(.+?)(?:\s*מ"ר)?/),
      available: extractValue(/כניסה:\s*(.+)/),
      phone: extractValue(/טלפון:\s*(.+)/),
      description: (() => {
        const match = text.match(/תיאור:\s*\n([\s\S]+?)(?=\n✨|$)/);
        return match ? match[1].trim() : '';
      })(),
      amenities: (() => {
        const match = text.match(/מה יש בדירה:\s*\n([\s\S]+)/);
        return match ? match[1].trim() : '';
      })()
    });

    toast({
      title: '✅ נקלט',
      description: 'המידע נקלט מהתבנית',
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">תבנית להעתקה ידנית</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono" dir="rtl">
              {template}
            </pre>
          </div>
          <Button onClick={copyTemplate} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            העתק תבנית
          </Button>
        </div>
      </Card>

      {/* Form Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">או מלא כאן ישירות</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rooms">חדרים</Label>
            <Input
              id="rooms"
              value={formData.rooms}
              onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
              placeholder="3.5"
            />
          </div>
          <div>
            <Label htmlFor="price">מחיר</Label>
            <Input
              id="price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="5000"
            />
          </div>
          <div>
            <Label htmlFor="city">עיר</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="מודיעין"
            />
          </div>
          <div>
            <Label htmlFor="neighborhood">שכונה</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="שכונת הפארק"
            />
          </div>
          <div>
            <Label htmlFor="phone">טלפון</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="050-1234567"
            />
          </div>
          <div>
            <Label htmlFor="floor">קומה</Label>
            <Input
              id="floor"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              placeholder="3"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <Label htmlFor="description">תיאור</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="דירה מרווחת ומוארת..."
            className="min-h-[100px]"
          />
        </div>

        <Button 
          className="mt-4 w-full gap-2"
          onClick={() => {
            const filled = generateFilledTemplate();
            navigator.clipboard.writeText(filled);
            toast({
              title: '✅ הועתק',
              description: 'המידע המלא הועתק',
            });
          }}
        >
          <Download className="h-4 w-4" />
          ייצא מידע מלא
        </Button>
      </Card>
    </div>
  );
}