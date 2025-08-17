'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DuplicateResolver } from './duplicate-resolver';
import { PropertyImageCarousel } from './property-image-carousel';
import {
  ArrowRight,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  Calendar,
  Phone,
  User,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface PropertyDetailProps {
  property: any; // TODO: Add proper type
  masterProperty?: any;
  duplicates?: any[];
}

export function PropertyDetail({ property, masterProperty, duplicates = [] }: PropertyDetailProps) {
  const [similarProperties, setSimilarProperties] = useState<any[]>([]);

  // Fetch similar properties if this is marked for review and has no master
  useEffect(() => {
    if (property.duplicate_status === 'review' && !masterProperty) {
      fetch('/api/find-similar-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.similarProperties) {
            setSimilarProperties(data.similarProperties);
          }
        })
        .catch(console.error);
    }
  }, [property.id, property.duplicate_status, masterProperty]);

  const formatPrice = (price: number, currency?: string) => {
    // Convert ₪ symbol to ILS code for Intl.NumberFormat
    const currencyCode = currency === '₪' ? 'ILS' : currency || 'ILS';

    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => {
          // Try to go back, but if there's no history, go to the home page
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = '/';
          }
        }}
      >
        <ArrowRight className="ml-2 h-4 w-4" />
        חזרה לרשימה
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Image gallery */}
          <Card>
            <PropertyImageCarousel images={property.property_images || []} title={property.title} />
          </Card>

          {/* Title and basic info */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    {(() => {
                      const locationData = Array.isArray(property.property_location)
                        ? property.property_location[0]
                        : property.property_location;
                      const { city, neighborhood } = locationData || {};
                      const location =
                        city && neighborhood ? `${city}, ${neighborhood}` : neighborhood || city;
                      const rooms = property.bedrooms ? `${property.bedrooms} חדרים` : '';
                      const size = property.square_meters ? `${property.square_meters} מ\"ר` : '';
                      const type = property.property_type || '';

                      // Build enhanced title
                      let enhancedTitle = property.title;

                      // Add location if not already in title
                      if (location && !property.title.includes(location.split(',')[0])) {
                        enhancedTitle = `${enhancedTitle} ב${location}`;
                      }

                      // Add key details if not already present
                      const details = [rooms, size, type].filter(Boolean);
                      if (
                        details.length > 0 &&
                        !details.some((detail) => property.title.includes(detail))
                      ) {
                        enhancedTitle = `${enhancedTitle} | ${details.join(' | ')}`;
                      }

                      return enhancedTitle;
                    })()}
                  </h1>
                  {property.listing_type && (
                    <Badge
                      variant={property.listing_type === 'rent' ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {property.listing_type === 'rent' ? 'להשכרה' : 'למכירה'}
                    </Badge>
                  )}
                </div>

                <div className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {(Array.isArray(property.property_location)
                      ? property.property_location[0]
                      : property.property_location
                    )?.formatted_address ||
                      (Array.isArray(property.property_location)
                        ? property.property_location[0]
                        : property.property_location
                      )?.address ||
                      `${(Array.isArray(property.property_location) ? property.property_location[0] : property.property_location)?.neighborhood || ''} ${(Array.isArray(property.property_location) ? property.property_location[0] : property.property_location)?.city || ''}`.trim() ||
                      'מיקום לא צוין'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {property.bedrooms !== null && property.bedrooms !== undefined && (
                    <div className="flex items-center gap-2">
                      <Bed className="text-muted-foreground h-4 w-4" />
                      <span>{property.bedrooms} חדרי שינה</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-2">
                      <Bath className="text-muted-foreground h-4 w-4" />
                      <span>{property.bathrooms} חדרי רחצה</span>
                    </div>
                  )}
                  {property.square_meters && (
                    <div className="flex items-center gap-2">
                      <Square className="text-muted-foreground h-4 w-4" />
                      <span>{property.square_meters} מ"ר</span>
                    </div>
                  )}
                  {property.property_type && (
                    <div className="flex items-center gap-2">
                      <Home className="text-muted-foreground h-4 w-4" />
                      <span>{property.property_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {property.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">תיאור</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{property.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          {property.property_amenities && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">מתקנים ותכונות</h2>
                <div className="flex flex-wrap gap-2">
                  {property.property_amenities.parking > 0 && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      חניה
                      {property.property_amenities.parking > 1 &&
                        ` (${property.property_amenities.parking})`}
                    </Badge>
                  )}
                  {property.property_amenities.elevator && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      מעלית
                    </Badge>
                  )}
                  {property.property_amenities.balcony > 0 && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      מרפסת
                      {property.property_amenities.balcony > 1 &&
                        ` (${property.property_amenities.balcony})`}
                    </Badge>
                  )}
                  {property.property_amenities.garden > 0 && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      גינה
                      {property.property_amenities.garden > 1 &&
                        ` (${property.property_amenities.garden})`}
                    </Badge>
                  )}
                  {property.property_amenities.air_conditioning && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      מיזוג אוויר
                    </Badge>
                  )}
                  {property.property_amenities.heating && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      חימום
                    </Badge>
                  )}
                  {property.property_amenities.internet && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      אינטרנט
                    </Badge>
                  )}
                  {property.property_amenities.equipped_kitchen && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      מטבח מצויד
                    </Badge>
                  )}
                  {property.property_amenities.safe_room && (
                    <Badge variant="secondary">
                      <CheckCircle className="ml-1 h-3 w-3" />
                      ממ"ד
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">
                    {property.listing_type === 'rent' ? 'מחיר לחודש' : 'מחיר'}
                  </p>
                  <p className="text-primary text-3xl font-bold">
                    {formatPrice(property.price_per_month, property.currency)}
                    {property.listing_type === 'rent' && <span className="text-lg">/חודש</span>}
                  </p>
                </div>

                {property.available_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>
                      זמין מ: {new Date(property.available_date).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                )}

                {(property.phone_normalized || property.contact_phone) && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      const phone = property.contact_phone || property.phone_normalized;
                      window.location.href = `tel:${phone}`;
                    }}
                  >
                    <Phone className="ml-2 h-4 w-4" />
                    {property.contact_phone || property.phone_normalized}
                  </Button>
                )}

                {property.source_url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={property.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="ml-2 h-4 w-4" />
                      צפה במקור
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Landlord info */}
          {property.landlord && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">פרטי בעל הנכס</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {property.landlord.profile_image_url ? (
                      <Image
                        src={property.landlord.profile_image_url}
                        alt={property.landlord.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                        <User className="text-muted-foreground h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{property.landlord.name}</p>
                      {property.landlord.phone_number && (
                        <p className="text-muted-foreground text-sm">
                          {property.landlord.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold">מידע נוסף</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">מקור:</dt>
                  <dd className="font-medium">{property.source_platform || 'לא ידוע'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">נוסף בתאריך:</dt>
                  <dd className="font-medium">
                    {new Date(property.created_at).toLocaleDateString('he-IL')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">עודכן לאחרונה:</dt>
                  <dd className="font-medium">
                    {new Date(property.updated_at).toLocaleDateString('he-IL')}
                  </dd>
                </div>
                {property.duplicate_status === 'review' && (
                  <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-yellow-800">
                    <p className="text-sm font-medium">⚠️ נכס זה מסומן לבדיקה</p>
                    <p className="mt-1 text-xs">ייתכן שקיים נכס דומה במערכת</p>
                    {masterProperty && (
                      <Link
                        href={`/property/${masterProperty.id}`}
                        className="mt-2 inline-flex items-center text-xs text-yellow-700 underline hover:text-yellow-900"
                      >
                        צפה בנכס הדומה: {masterProperty.title}
                        <ExternalLink className="mr-1 h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Duplicate resolver for propertys in review */}
          {property.duplicate_status === 'review' && (
            <DuplicateResolver
              propertyId={property.id}
              similarProperties={similarProperties}
              masterPropertyId={masterProperty?.id}
              currentProperty={property}
            />
          )}

          {/* Duplicates section for master propertys */}
          {duplicates.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">נכסים דומים שזוהו</h3>
                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="hover:bg-muted/50 rounded-lg border p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/property/${dup.id}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {dup.title}
                          </Link>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {(Array.isArray(dup.property_location)
                              ? dup.property_location[0]
                              : dup.property_location
                            )?.formatted_address ||
                              (Array.isArray(dup.property_location)
                                ? dup.property_location[0]
                                : dup.property_location
                              )?.address ||
                              `${(Array.isArray(dup.property_location) ? dup.property_location[0] : dup.property_location)?.neighborhood || ''} ${(Array.isArray(dup.property_location) ? dup.property_location[0] : dup.property_location)?.city || ''}`.trim() ||
                              'מיקום לא צוין'}{' '}
                            • {formatPrice(dup.price_per_month, dup.currency)}
                            {property.listing_type === 'rent' && '/חודש'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            dup.duplicate_status === 'duplicate' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {dup.duplicate_status === 'duplicate' ? 'כפול' : 'לבדיקה'}
                          {dup.duplicate_score && ` (${dup.duplicate_score}%)`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
