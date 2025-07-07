// Utility functions for database operations

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function transformToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(transformToCamelCase) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        transformed[camelKey] = transformToCamelCase(obj[key]);
      }
    }
    return transformed;
  }

  return obj;
}

/**
 * Transform property data from database format to frontend format
 */
export function transformProperty(dbProperty: any) {
  const transformed = transformToCamelCase(dbProperty);

  // Ensure images is always an array
  if (transformed.propertyImages) {
    transformed.images = transformed.propertyImages;
    delete transformed.propertyImages;
  }

  // Transform property_amenities to amenities
  if (transformed.propertyAmenities) {
    transformed.amenities = transformed.propertyAmenities.map((pa: any) => pa.amenity);
    delete transformed.propertyAmenities;
  }

  // Ensure pricePerMonth is a string (it comes as a decimal string from Postgres)
  if (transformed.pricePerMonth) {
    transformed.pricePerMonth = String(transformed.pricePerMonth);
  }

  return transformed;
}
