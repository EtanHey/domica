'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PropertyImageCarousel } from './property-image-carousel';
import {
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  Calendar,
  Phone,
  User,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';

interface PropertyComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property1: any;
  property2: any;
  onMarkAsUnique?: (propertyId: string) => void;
  onMarkAsDuplicate?: (keepId: string, duplicateId: string) => void;
}

export function PropertyComparisonModal({
  open,
  onOpenChange,
  property1,
  property2,
  onMarkAsUnique,
  onMarkAsDuplicate,
}: PropertyComparisonModalProps) {
  if (!property1 || !property2) return null;

  const formatPrice = (price: number, currency: string = 'ILS') => {
    // Convert ₪ symbol to ILS code for Intl.NumberFormat
    const currencyCode = currency === '₪' ? 'ILS' : currency;

    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL');
  };

  const ComparisonRow = ({ label, value1, value2, highlight = false }: any) => {
    const isDifferent = value1 !== value2;
    return (
      <div
        className={`grid grid-cols-3 gap-4 py-2 ${highlight && isDifferent ? 'bg-yellow-50' : ''}`}
      >
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className="text-sm">{value1 || '-'}</div>
        <div className="text-sm">{value2 || '-'}</div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>השוואת נכסים</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-6">
          {/* Property 1 */}
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold">{property1.title}</h3>
                {property1.duplicate_status === 'review' && (
                  <Badge variant="secondary" className="shrink-0">
                    לבדיקה
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
                <MapPin className="h-3 w-3" />
                <span>{property1.location_text || 'מיקום לא צוין'}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-primary font-semibold">
                  {formatPrice(property1.price_per_month, property1.currency)}
                  {property1.listing_type === 'rent' && '/חודש'}
                </span>
                {property1.bedrooms && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {property1.bedrooms}
                  </span>
                )}
                {property1.square_feet && (
                  <span className="flex items-center gap-1">
                    <Square className="h-3 w-3" />
                    {property1.square_feet} מ״ר
                  </span>
                )}
              </div>
              {property1.source_url && (
                <a
                  href={property1.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  צפה במקור
                </a>
              )}
            </div>

            {/* Images */}
            <div className="h-64">
              <PropertyImageCarousel
                images={property1.property_images || []}
                title={property1.title}
              />
            </div>
          </div>

          {/* Property 2 */}
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold">{property2.title}</h3>
                {property2.duplicate_status === 'review' && (
                  <Badge variant="secondary" className="shrink-0">
                    לבדיקה
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
                <MapPin className="h-3 w-3" />
                <span>{property2.location_text || 'מיקום לא צוין'}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-primary font-semibold">
                  {formatPrice(property2.price_per_month, property2.currency)}
                  {property2.listing_type === 'rent' && '/חודש'}
                </span>
                {property2.bedrooms && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {property2.bedrooms}
                  </span>
                )}
                {property2.square_feet && (
                  <span className="flex items-center gap-1">
                    <Square className="h-3 w-3" />
                    {property2.square_feet} מ״ר
                  </span>
                )}
              </div>
              {property2.source_url && (
                <a
                  href={property2.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  צפה במקור
                </a>
              )}
            </div>

            {/* Images */}
            <div className="h-64">
              <PropertyImageCarousel
                images={property2.property_images || []}
                title={property2.title}
              />
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Comparison Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-4 border-b py-2 font-semibold">
            <div>פרטים</div>
            <div>{property1.title}</div>
            <div>{property2.title}</div>
          </div>

          <ComparisonRow
            label="מחיר לחודש"
            value1={formatPrice(property1.price_per_month, property1.currency)}
            value2={formatPrice(property2.price_per_month, property2.currency)}
            highlight={true}
          />

          <ComparisonRow
            label="מיקום"
            value1={property1.location_text}
            value2={property2.location_text}
            highlight={true}
          />

          <ComparisonRow
            label="חדרי שינה"
            value1={property1.bedrooms}
            value2={property2.bedrooms}
            highlight={true}
          />

          <ComparisonRow
            label="חדרי רחצה"
            value1={property1.bathrooms}
            value2={property2.bathrooms}
          />

          <ComparisonRow
            label="שטח (מ״ר)"
            value1={property1.square_feet}
            value2={property2.square_feet}
            highlight={true}
          />

          <ComparisonRow
            label="סוג נכס"
            value1={property1.property_type}
            value2={property2.property_type}
          />

          <ComparisonRow
            label="תאריך זמין"
            value1={property1.available_date ? formatDate(property1.available_date) : '-'}
            value2={property2.available_date ? formatDate(property2.available_date) : '-'}
          />

          <ComparisonRow
            label="מקור"
            value1={property1.source_platform}
            value2={property2.source_platform}
          />

          <ComparisonRow
            label="תאריך פרסום"
            value1={formatDate(property1.created_at)}
            value2={formatDate(property2.created_at)}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (onMarkAsUnique) {
                onMarkAsUnique(property1.id);
              }
              onOpenChange(false);
            }}
          >
            <CheckCircle className="ml-2 h-4 w-4" />
            אלו נכסים שונים
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              if (onMarkAsDuplicate) {
                // Keep property2, mark property1 as duplicate
                onMarkAsDuplicate(property2.id, property1.id);
              }
              onOpenChange(false);
            }}
          >
            <X className="ml-2 h-4 w-4" />
            סמן כפילות - השאר את {property2.title}
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              if (onMarkAsDuplicate) {
                // Keep property1, mark property2 as duplicate
                onMarkAsDuplicate(property1.id, property2.id);
              }
              onOpenChange(false);
            }}
          >
            <X className="ml-2 h-4 w-4" />
            סמן כפילות - השאר את {property1.title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
