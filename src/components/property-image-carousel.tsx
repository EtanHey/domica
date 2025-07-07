'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  console.log('PropertyImageCarousel debug:', {
    title,
    rawImages: images,
    imageUrls: images?.map((img) => img.image_url),
  });

  // Check if we're in RTL mode
  const isRTL = document.documentElement.dir === 'rtl';

  // Sort images by order
  const sortedImages = images?.sort((a, b) => (a.image_order || 0) - (b.image_order || 0)) || [];

  // Filter out invalid image URLs and prioritize UploadThing URLs
  const validImages = sortedImages.filter((img) => {
    return (
      img?.image_url &&
      typeof img.image_url === 'string' &&
      !img.image_url.startsWith('data:') &&
      (img.image_url.includes('utfs.io') ||
        img.image_url.includes('uploadthing.') ||
        (img.image_url.startsWith('http') &&
          !img.image_url.includes('yad2.co.il') &&
          !img.image_url.includes('img.yad2')) ||
        img.image_url.startsWith('/'))
    );
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
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex === allImages.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  };

  // Touch/Mouse handlers
  const handleStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    currentX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return;
    currentX.current = clientX;
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = startX.current - currentX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      // Simple swipe logic: swipe right = next, swipe left = previous
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  return (
    <div className="w-full">
      {/* Main Carousel */}
      <div
        className="relative overflow-hidden rounded-lg bg-black"
        ref={carouselRef}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
          className={`flex transition-transform ${isTransitioning ? 'duration-300' : 'duration-0'}`}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {allImages.map((image, index) => (
            <div key={index} className="relative h-[300px] w-full flex-shrink-0 md:h-[400px]">
              <img
                src={image?.image_url || '/placeholder-rental.jpg'}
                alt={`${title} - תמונה ${index + 1}`}
                className="h-full w-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
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
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white"
              onClick={goToPrevious}
              aria-label="תמונה קודמת"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white"
              onClick={goToNext}
              aria-label="תמונה הבאה"
            >
              <ChevronLeft className="h-5 w-5" />
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
                  ? 'bg-primary w-8 scale-110'
                  : 'w-3 border border-gray-300 bg-white/80 hover:bg-white'
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
                onError={(e) => {
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
