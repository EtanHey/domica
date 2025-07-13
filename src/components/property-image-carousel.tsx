'use client';

import { useState } from 'react';
import { HouseIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyImageCarouselProps {
  images: Array<{
    image_url?: string;
    is_primary?: boolean;
    image_order?: number;
  }>;
  title: string;
}

export function PropertyImageCarousel({ images, title }: PropertyImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sort images by order
  const sortedImages = images?.sort((a, b) => (a.image_order || 0) - (b.image_order || 0)) || [];

  // Filter out invalid image URLs and prioritize UploadThing URLs
  const validImages = sortedImages.filter(img => {
    return img?.image_url && 
           typeof img.image_url === 'string' && 
           !img.image_url.startsWith('data:') && 
           (img.image_url.includes('utfs.io') || 
            img.image_url.includes('uploadthing.') || 
            img.image_url.includes('ufs.sh') || 
            (img.image_url.startsWith('http') && !img.image_url.includes('yad2.co.il') && !img.image_url.includes('img.yad2')) ||
            img.image_url.startsWith('/'));
  });

  const primaryImage = validImages.find((img) => img.is_primary) || validImages[0];
  const allImages = primaryImage
    ? [primaryImage, ...validImages.filter((img) => !img.is_primary)]
    : validImages;

  if (allImages.length === 0) {
    return (
      <div className="bg-muted flex aspect-[16/9] items-center justify-center rounded-lg">
        <div className="text-muted-foreground text-center">
          <HouseIcon className="mx-auto h-16 w-16" />
          <p className="mt-2">אין תמונות</p>
        </div>
      </div>
    );
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex === allImages.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  };

  return (
    <div className="w-full">
      {/* Main Carousel - Simple approach without Embla */}
      <div className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 w-full">
        <div className="relative h-[300px] md:h-[400px]">
          {allImages.map((image, index) => (
            <div 
              key={`${image.image_url}-${index}`} 
              className={`absolute inset-0 transition-opacity duration-300 ${
                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={image?.image_url || '/placeholder-rental.jpg'}
                alt={`${title} - תמונה ${index + 1}`}
                className="h-full w-full object-contain"
                loading={index === 0 ? "eager" : "lazy"}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-rental.jpg';
                }}
              />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        {allImages.length > 1 && (
          <>
            <button
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-black/90 dark:hover:bg-black z-20"
              onClick={goToPrevious}
              aria-label="תמונה קודמת"
            >
              <ChevronRight className="h-5 w-5 text-gray-800 dark:text-white" />
            </button>
            <button
              className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-black/90 dark:hover:bg-black z-20"
              onClick={goToNext}
              aria-label="תמונה הבאה"
            >
              <ChevronLeft className="h-5 w-5 text-gray-800 dark:text-white" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {allImages.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {allImages.map((_, index) => (
            <button
              key={index}
              className={`h-3 rounded-full transition-all shadow-lg ${
                index === currentIndex 
                  ? 'w-8 bg-white/50 scale-110' 
                  : 'w-3 bg-white/30 hover:bg-white border border-gray-300'
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`עבור לתמונה ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail Grid */}
      {allImages.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-6 lg:grid-cols-8">
          {allImages.map((image, index) => (
            <button
              key={index}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary'
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => goToSlide(index)}
            >
              <img
                src={image?.image_url || '/placeholder-rental.jpg'}
                alt={`תמונה ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
                onLoad={() => {
                  console.log(`✅ Thumbnail ${index + 1} loaded:`, image?.image_url);
                }}
                onError={(e) => {
                  console.error(`❌ Thumbnail ${index + 1} failed:`, image?.image_url);
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-rental.jpg';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}