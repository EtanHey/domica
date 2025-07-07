'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PropertyComparison } from '@/components/property-comparison';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const property1Id = searchParams.get('property1');
  const property2Id = searchParams.get('property2');

  const [property1, setProperty1] = useState<any>(null);
  const [property2, setProperty2] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!property1Id || !property2Id) {
      setError('חסרים פרטי נכסים להשוואה');
      setLoading(false);
      return;
    }

    const fetchProperties = async () => {
      try {
        setLoading(true);

        // Fetch both properties
        const [prop1Result, prop2Result] = await Promise.all([
          supabase
            .from('properties')
            .select(
              `
              *,
              property_images(
                image_url,
                is_primary,
                image_order
              ),
              landlord:landlords(*),
              property_amenities(
                amenity:amenities(*)
              )
            `
            )
            .eq('id', property1Id)
            .single(),
          supabase
            .from('properties')
            .select(
              `
              *,
              property_images(
                image_url,
                is_primary,
                image_order
              ),
              landlord:landlords(*),
              property_amenities(
                amenity:amenities(*)
              )
            `
            )
            .eq('id', property2Id)
            .single(),
        ]);

        if (prop1Result.error || !prop1Result.data) {
          setError('לא ניתן לטעון את הנכס הראשון');
          return;
        }

        if (prop2Result.error || !prop2Result.data) {
          setError('לא ניתן לטעון את הנכס השני');
          return;
        }

        setProperty1(prop1Result.data);
        setProperty2(prop2Result.data);
      } catch (err) {
        setError('שגיאה בטעינת הנכסים');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [property1Id, property2Id]);

  const handleMarkAsUnique = async (propertyId: string) => {
    try {
      const response = await fetch('/api/resolve-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          decision: 'unique',
        }),
      });

      if (response.ok) {
        router.push('/review');
      }
    } catch (error) {
      console.error('Error marking as unique:', error);
    }
  };

  const handleMarkAsDuplicate = async (keepId: string, duplicateId: string) => {
    try {
      const response = await fetch('/api/merge-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: keepId,
          duplicateId,
        }),
      });

      if (response.ok) {
        router.push(`/property/${keepId}`);
      }
    } catch (error) {
      console.error('Error merging properties:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">טוען נכסים להשוואה...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property1 || !property2) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'שגיאה בטעינת הנכסים'}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowRight className="ml-2 h-4 w-4" />
              חזרה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Back button */}
      <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
        <ArrowRight className="ml-2 h-4 w-4" />
        חזרה
      </Button>

      <PropertyComparison
        property1={property1}
        property2={property2}
        onMarkAsUnique={handleMarkAsUnique}
        onMarkAsDuplicate={handleMarkAsDuplicate}
      />
    </div>
  );
}
