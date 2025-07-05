import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath } from 'lucide-react';
import { Button } from './ui/button';

interface RentalImage {
  image_url: string;
  is_primary?: boolean;
}

interface Rental {
  id: string;
  title: string;
  price_per_month: number;
  currency?: string;
  location_text: string;
  bedrooms?: number;
  bathrooms?: number;
  rental_images?: RentalImage[];
}

interface RentalCardProps {
  rental: Rental;
}

export function RentalCard({ rental }: RentalCardProps) {
  const primaryImage = rental.rental_images?.find((img) => img.is_primary);
  const imageUrl =
    primaryImage?.image_url || rental.rental_images?.[0]?.image_url || '/placeholder-rental.jpg';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: rental.currency || 'ILS',
    }).format(price);
  };

  return (
    <div className="bg-card overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/rentals/${rental.id}`}>
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={rental.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
          />
        </div>
      </Link>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{rental.title}</h3>

        <p className="text-primary mb-2 text-2xl font-bold">
          {formatPrice(rental.price_per_month)}/חודש
        </p>

        <div className="text-muted-foreground mb-2 flex items-center text-sm">
          <MapPin className="mr-1 h-4 w-4" />
          <span className="line-clamp-1">{rental.location_text}</span>
        </div>

        <div className="text-muted-foreground mb-4 flex items-center gap-4 text-sm">
          {rental.bedrooms && (
            <div className="flex items-center">
              <Bed className="mr-1 h-4 w-4" />
              <span>{rental.bedrooms} חדרים</span>
            </div>
          )}
          {rental.bathrooms && (
            <div className="flex items-center">
              <Bath className="mr-1 h-4 w-4" />
              <span>{rental.bathrooms} מקלחות</span>
            </div>
          )}
        </div>

        <Button asChild className="w-full">
          <Link href={`/rentals/${rental.id}`}>פרטים נוספים</Link>
        </Button>
      </div>
    </div>
  );
}
