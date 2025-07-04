import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Bed, Bath } from 'lucide-react'
import { Button } from './ui/button'

// AI-DEV: Individual rental card component for grid display
interface RentalCardProps {
  rental: any // Will be properly typed with Rental type from db
}

export function RentalCard({ rental }: RentalCardProps) {
  const primaryImage = rental.rental_images?.find((img: any) => img.is_primary)
  const imageUrl = primaryImage?.image_url || rental.rental_images?.[0]?.image_url || '/placeholder-rental.jpg'
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: rental.currency || 'USD',
    }).format(price)
  }

  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/rentals/${rental.id}`}>
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={rental.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </Link>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {rental.title}
        </h3>
        
        <p className="text-2xl font-bold text-primary mb-2">
          {formatPrice(rental.price_per_month)}/mo
        </p>
        
        <div className="flex items-center text-muted-foreground text-sm mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{rental.location_text}</span>
        </div>
        
        <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
          {rental.bedrooms && (
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              <span>{rental.bedrooms} bed</span>
            </div>
          )}
          {rental.bathrooms && (
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              <span>{rental.bathrooms} bath</span>
            </div>
          )}
        </div>
        
        <Button asChild className="w-full">
          <Link href={`/rentals/${rental.id}`}>
            View Details
          </Link>
        </Button>
      </div>
    </div>
  )
}