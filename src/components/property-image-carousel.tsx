'use client';

import { useState, useEffect, useMemo } from 'react';
import { HouseIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

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
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<number, boolean>>({});

  // Memoize the processed images to prevent infinite re-renders
  const allImages = useMemo(() => {
    // Sort images by order
    const sortedImages = images?.slice().sort((a, b) => (a.image_order || 0) - (b.image_order || 0)) || [];

    // Filter out invalid image URLs and prioritize UploadThing URLs
    const validImages = sortedImages.filter((img) => {
      return (
        img?.image_url &&
        typeof img.image_url === 'string' &&
        !img.image_url.startsWith('data:') &&
        (img.image_url.includes('utfs.io') ||
          img.image_url.includes('uploadthing.') ||
          img.image_url.includes('ufs.sh') ||
          (img.image_url.startsWith('http') &&
            !img.image_url.includes('yad2.co.il') &&
            !img.image_url.includes('img.yad2')) ||
          img.image_url.startsWith('/'))
      );
    });

    const primaryImage = validImages.find((img) => img.is_primary) || validImages[0];
    return primaryImage
      ? [primaryImage, ...validImages.filter((img) => !img.is_primary)]
      : validImages;
  }, [images]);

  // Debug logging removed to prevent console spam

  // Track image load status without manual preloading
  // Next.js Image component handles preloading efficiently with priority and loading props
  useEffect(() => {
    // Initialize load status tracking for all images
    const initialStatus: Record<number, boolean> = {};
    for (let i = 0; i < allImages.length; i++) {
      initialStatus[i] = false;
    }
    setImageLoadStatus(initialStatus);
  }, [allImages.length]); // Only depend on length, not the array itself

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
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="relative h-[300px] md:h-[400px]">
          {allImages.map((image, index) => (
            <div
              key={`${image.image_url}-${index}`}
              className={`absolute inset-0 transition-opacity duration-300 ${
                index === currentIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
              }`}
            >
              <Image
                src={image?.image_url || '/placeholder-rental.jpg'}
                alt={`${title} - תמונה ${index + 1}`}
                fill
                className="object-contain"
                priority={index === 0} // Only first image gets priority
                loading="eager" // Load all images eagerly for carousel
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={() => {
                  setImageLoadStatus((prev) => ({ ...prev, [index]: true }));
                }}
                onError={() => {
                  console.error(`❌ Main carousel image ${index + 1} failed:`, image?.image_url);
                }}
              />
              {!imageLoadStatus[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-gray-500 dark:text-gray-400">טוען תמונה...</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        {allImages.length > 1 && (
          <>
            <button
              className="absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-black/90 dark:hover:bg-black"
              onClick={goToPrevious}
              aria-label="תמונה קודמת"
            >
              <ChevronRight className="h-5 w-5 text-gray-800 dark:text-white" />
            </button>
            <button
              className="absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-black/90 dark:hover:bg-black"
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
              className={`h-3 rounded-full shadow-lg transition-all ${
                index === currentIndex
                  ? 'w-8 scale-110 bg-white/50'
                  : 'w-3 border border-gray-300 bg-white/30 hover:bg-white'
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
              <Image
                src={image?.image_url || '/placeholder-rental.jpg'}
                alt={`תמונה ${index + 1}`}
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 25vw, (max-width: 1200px) 16vw, 12vw"
                onError={() => {
                  console.error(`❌ Thumbnail ${index + 1} failed:`, image?.image_url);
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
