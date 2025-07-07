'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeftRight,
} from 'lucide-react';

interface PropertyComparisonProps {
  property1: any;
  property2: any;
  onMarkAsUnique?: (propertyId: string) => void;
  onMarkAsDuplicate?: (keepId: string, duplicateId: string) => void;
}

export function PropertyComparison({
  property1,
  property2,
  onMarkAsUnique,
  onMarkAsDuplicate,
}: PropertyComparisonProps) {
  if (!property1 || !property2) return null;

  const formatPrice = (price: number, currency: string = 'ILS') => {
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
        className={`grid grid-cols-1 gap-4 border-b py-4 md:grid-cols-3 ${
          highlight && isDifferent ? '-mx-4 bg-yellow-50 px-4 dark:bg-yellow-900/10' : ''
        }`}
      >
        <div className="text-muted-foreground font-medium">{label}</div>
        <div className="flex items-center justify-between md:justify-center">
          <span className="text-muted-foreground text-sm md:hidden">נכס 1:</span>
          <span className={isDifferent && highlight ? 'font-semibold' : ''}>{value1 || '-'}</span>
        </div>
        <div className="flex items-center justify-between md:justify-center">
          <span className="text-muted-foreground text-sm md:hidden">נכס 2:</span>
          <span className={isDifferent && highlight ? 'font-semibold' : ''}>{value2 || '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2 flex items-center justify-center gap-3 text-3xl font-bold">
          השוואת נכסים
          <ArrowLeftRight className="text-muted-foreground h-8 w-8" />
        </h1>
        <p className="text-muted-foreground">השווה בין שני נכסים כדי לזהות האם מדובר בכפילות</p>
      </div>

      {/* Properties side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span className="line-clamp-2">{property1.title}</span>
              {property1.duplicate_status === 'review' && (
                <Badge variant="secondary" className="shrink-0">
                  לבדיקה
                </Badge>
              )}
            </CardTitle>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{property1.location_text || 'מיקום לא צוין'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-primary text-lg font-semibold">
                  {formatPrice(property1.price_per_month, property1.currency)}
                  {property1.listing_type === 'rent' && '/חודש'}
                </span>
                {property1.bedrooms !== null && property1.bedrooms !== undefined && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property1.bedrooms} חדרי שינה
                  </span>
                )}
                {property1.square_feet && (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    {property1.square_feet} מ״ר
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Images */}
              <div className="h-64">
                <PropertyImageCarousel
                  images={property1.property_images || []}
                  title={property1.title}
                />
              </div>

              {/* Description */}
              {property1.description && (
                <div>
                  <h4 className="mb-2 font-semibold">תיאור</h4>
                  <p className="text-muted-foreground line-clamp-4 text-sm">
                    {property1.description}
                  </p>
                </div>
              )}

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {property1.property_type && (
                  <div className="flex items-center gap-2">
                    <Home className="text-muted-foreground h-4 w-4" />
                    <span>{property1.property_type}</span>
                  </div>
                )}
                {property1.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="text-muted-foreground h-4 w-4" />
                    <span>{property1.bathrooms} חדרי רחצה</span>
                  </div>
                )}
                {property1.available_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>זמין מ-{formatDate(property1.available_date)}</span>
                  </div>
                )}
                {property1.phone_normalized && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <span>{property1.phone_normalized}</span>
                  </div>
                )}
              </div>

              {/* Source link */}
              {property1.source_url && (
                <a
                  href={property1.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  צפה במקור
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span className="line-clamp-2">{property2.title}</span>
              {property2.duplicate_status === 'review' && (
                <Badge variant="secondary" className="shrink-0">
                  לבדיקה
                </Badge>
              )}
            </CardTitle>
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{property2.location_text || 'מיקום לא צוין'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-primary text-lg font-semibold">
                  {formatPrice(property2.price_per_month, property2.currency)}
                  {property2.listing_type === 'rent' && '/חודש'}
                </span>
                {property2.bedrooms !== null && property2.bedrooms !== undefined && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property2.bedrooms} חדרי שינה
                  </span>
                )}
                {property2.square_feet && (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    {property2.square_feet} מ״ר
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Images */}
              <div className="h-64">
                <PropertyImageCarousel
                  images={property2.property_images || []}
                  title={property2.title}
                />
              </div>

              {/* Description */}
              {property2.description && (
                <div>
                  <h4 className="mb-2 font-semibold">תיאור</h4>
                  <p className="text-muted-foreground line-clamp-4 text-sm">
                    {property2.description}
                  </p>
                </div>
              )}

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {property2.property_type && (
                  <div className="flex items-center gap-2">
                    <Home className="text-muted-foreground h-4 w-4" />
                    <span>{property2.property_type}</span>
                  </div>
                )}
                {property2.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="text-muted-foreground h-4 w-4" />
                    <span>{property2.bathrooms} חדרי רחצה</span>
                  </div>
                )}
                {property2.available_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>זמין מ-{formatDate(property2.available_date)}</span>
                  </div>
                )}
                {property2.phone_normalized && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <span>{property2.phone_normalized}</span>
                  </div>
                )}
              </div>

              {/* Source link */}
              {property2.source_url && (
                <a
                  href={property2.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  צפה במקור
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>השוואה מפורטת</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <ComparisonRow
              label="מחיר"
              value1={`${formatPrice(property1.price_per_month, property1.currency)}${
                property1.listing_type === 'rent' ? '/חודש' : ''
              }`}
              value2={`${formatPrice(property2.price_per_month, property2.currency)}${
                property2.listing_type === 'rent' ? '/חודש' : ''
              }`}
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
              label="טלפון"
              value1={property1.phone_normalized}
              value2={property2.phone_normalized}
              highlight={true}
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

            <ComparisonRow
              label="עודכן לאחרונה"
              value1={formatDate(property1.updated_at)}
              value2={formatDate(property2.updated_at)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Amenities Comparison */}
      {(property1.property_amenities?.length > 0 || property2.property_amenities?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>השוואת מתקנים ותכונות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="mb-3 font-medium">{property1.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {property1.property_amenities?.length > 0 ? (
                    property1.property_amenities.map((item: any) => (
                      <Badge key={item.amenity.id} variant="secondary">
                        <CheckCircle className="ml-1 h-3 w-3" />
                        {item.amenity.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">אין מתקנים רשומים</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-3 font-medium">{property2.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {property2.property_amenities?.length > 0 ? (
                    property2.property_amenities.map((item: any) => (
                      <Badge key={item.amenity.id} variant="secondary">
                        <CheckCircle className="ml-1 h-3 w-3" />
                        {item.amenity.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">אין מתקנים רשומים</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold">מה ברצונך לעשות?</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  if (onMarkAsUnique) {
                    onMarkAsUnique(property1.id);
                  }
                }}
              >
                <CheckCircle className="ml-2 h-5 w-5" />
                אלו נכסים שונים
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  if (onMarkAsDuplicate) {
                    onMarkAsDuplicate(property2.id, property1.id);
                  }
                }}
              >
                <X className="ml-2 h-5 w-5" />
                סמן כפילות - השאר את נכס 2
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  if (onMarkAsDuplicate) {
                    onMarkAsDuplicate(property1.id, property2.id);
                  }
                }}
              >
                <X className="ml-2 h-5 w-5" />
                סמן כפילות - השאר את נכס 1
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
