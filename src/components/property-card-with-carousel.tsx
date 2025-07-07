'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

import type { PropertyWithRelations } from '@/types/property';

interface PropertyCardProps {
  property: PropertyWithRelations;
}

export function PropertyCardWithCarousel({ property }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sort images to have primary image first
  const images = property.images || [];
  
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.imageOrder || 0) - (b.imageOrder || 0);
  });

  const imageUrls =
    sortedImages.length > 0
      ? sortedImages.map((img) => img.imageUrl).filter(url => {
          // Only allow UploadThing URLs and valid HTTP URLs, filter out Yad2 URLs and SVGs
          return url && 
                 typeof url === 'string' && 
                 !url.startsWith('data:') && 
                 !url.toLowerCase().endsWith('.svg') &&
                 (url.includes('utfs.io') || url.includes('uploadthing.') || 
                  (url.startsWith('http') && !url.includes('yad2.co.il') && !url.includes('img.yad2')));
        })
      : [];

  // If no valid URLs, use fallback
  const finalImageUrls = imageUrls.length > 0 
    ? imageUrls 
    : ['https://utfs.io/f/ErznS8cNMHlPwNeWJbGFASWOq8cpgZKI6N2mDBoGVLrsvlfC'];

  const formatPrice = (price: string) => {
    // Convert ₪ symbol to ILS code for Intl.NumberFormat
    const currencyCode = property.currency === '₪' ? 'ILS' : (property.currency || 'ILS');
    
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(price));
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? finalImageUrls.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === finalImageUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border dark:border-gray-700">
      <Link href={`/property/${property.id}`}>
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
          {/* Main Image */}
          <Image
            src={finalImageUrls[currentImageIndex] || '/placeholder-rental.jpg'}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={currentImageIndex === 0}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-rental.jpg';
            }}
          />

          {/* Navigation Buttons - Only show if more than 1 image */}
          {finalImageUrls.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute top-1/2 right-2 -translate-y-1/2 transform rounded-full bg-white/80 p-1.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
                aria-label="תמונה קודמת"
              >
                <ChevronRight className="h-4 w-4 text-gray-800" />
              </button>
              <button
                onClick={goToNext}
                className="absolute top-1/2 left-2 -translate-y-1/2 transform rounded-full bg-white/80 p-1.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
                aria-label="תמונה הבאה"
              >
                <ChevronLeft className="h-4 w-4 text-gray-800" />
              </button>
            </>
          )}

          {/* Image Indicators */}
          {finalImageUrls.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 transform gap-1.5">
              {finalImageUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`h-2 w-2 rounded-full transition-all shadow-md ${
                    index === currentImageIndex ? 'w-6 bg-white scale-110' : 'bg-white/70 hover:bg-white/90'
                  }`}
                  aria-label={`תמונה ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Status Badge */}
          {property.duplicateStatus === 'review' && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 border-yellow-600 bg-yellow-500 text-white"
            >
              <AlertCircle className="ml-1 h-3 w-3" />
              לבדיקה
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{property.title}</h3>

        <p className="mb-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
          {formatPrice(property.pricePerMonth)}
          {property.listingType !== 'sale' && '/חודש'}
        </p>

        <div className="mb-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="mr-1 h-4 w-4" />
          <span className="line-clamp-1">{property.locationText}</span>
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {property.bedrooms && (
            <div className="flex items-center">
              <Bed className="mr-1 h-4 w-4" />
              <span>{property.bedrooms} חדרים</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center">
              <Bath className="mr-1 h-4 w-4" />
              <span>{property.bathrooms} מקלחות</span>
            </div>
          )}
        </div>

        <Button asChild className="w-full">
          <Link href={`/property/${property.id}`}>פרטים נוספים</Link>
        </Button>
      </div>
    </div>
  );
}
