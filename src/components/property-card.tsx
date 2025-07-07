import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PropertyImage {
  imageUrl: string;
  isPrimary?: boolean | null;
}

interface Property {
  id: string;
  title: string;
  pricePerMonth: string;
  currency?: string | null;
  locationText: string | null;
  bedrooms?: number | null;
  bathrooms?: string | null;
  images?: PropertyImage[];
  duplicateStatus?: string | null;
  duplicateScore?: string | null;
  listingType?: string | null;
}

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const primaryImage = property.images?.find((img) => img.isPrimary);
  const imageUrl =
    primaryImage?.imageUrl ||
    property.images?.[0]?.imageUrl ||
    'https://utfs.io/f/ErznS8cNMHlPwNeWJbGFASWOq8cpgZKI6N2mDBoGVLrsvlfC';

  const formatPrice = (price: string) => {
    // Convert ₪ symbol to ILS code for Intl.NumberFormat
    const currencyCode = property.currency === '₪' ? 'ILS' : property.currency || 'ILS';

    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(price));
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-md dark:border dark:border-gray-700 dark:bg-gray-800">
      <Link href={`/property/${property.id}`}>
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
          />
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
          <span className="line-clamp-1">{property.locationText || ''}</span>
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
              <span>{parseFloat(property.bathrooms)} מקלחות</span>
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
