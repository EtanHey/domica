// Centralized query keys for TanStack Query
// This ensures type safety and prevents typos across the application

export const QueryKeys = {
  // Property queries
  properties: {
    all: ['properties'] as const,
    list: (filters?: { city?: string; minRooms?: number; maxPrice?: number }) =>
      ['properties', 'list', filters] as const,
    detail: (id: string) => ['properties', 'detail', id] as const,
    images: (propertyId: string) => ['properties', 'images', propertyId] as const,
  },

  // Landlord queries
  landlords: {
    all: ['landlords'] as const,
    detail: (id: string) => ['landlords', 'detail', id] as const,
    properties: (landlordId: string) => ['landlords', 'properties', landlordId] as const,
  },

  // Amenities queries
  amenities: {
    all: ['amenities'] as const,
    byProperty: (propertyId: string) => ['amenities', 'property', propertyId] as const,
  },

  // Price history queries
  priceHistory: {
    byProperty: (propertyId: string) => ['price-history', 'property', propertyId] as const,
  },

  // Scraping queries
  scraping: {
    yad2: (url: string) => ['scraping', 'yad2', url] as const,
    facebook: (groupId: string) => ['scraping', 'facebook', groupId] as const,
    status: (jobId: string) => ['scraping', 'status', jobId] as const,
  },

  // Search queries
  search: {
    locations: (query: string) => ['search', 'locations', query] as const,
    suggestions: (query: string) => ['search', 'suggestions', query] as const,
  },
} as const;

// Type helpers for query keys
export type PropertyQueryKey =
  | typeof QueryKeys.properties.all
  | ReturnType<typeof QueryKeys.properties.list>
  | ReturnType<typeof QueryKeys.properties.detail>
  | ReturnType<typeof QueryKeys.properties.images>;

export type LandlordQueryKey =
  | typeof QueryKeys.landlords.all
  | ReturnType<typeof QueryKeys.landlords.detail>
  | ReturnType<typeof QueryKeys.landlords.properties>;

export type AmenityQueryKey =
  | typeof QueryKeys.amenities.all
  | ReturnType<typeof QueryKeys.amenities.byProperty>;

export type ScrapingQueryKey =
  | ReturnType<typeof QueryKeys.scraping.yad2>
  | ReturnType<typeof QueryKeys.scraping.facebook>
  | ReturnType<typeof QueryKeys.scraping.status>;

export type SearchQueryKey =
  | ReturnType<typeof QueryKeys.search.locations>
  | ReturnType<typeof QueryKeys.search.suggestions>;

// Mutation keys for mutations that need to be tracked
export const MutationKeys = {
  // Property mutations
  createProperty: ['create-property'] as const,
  updateProperty: ['update-property'] as const,
  deleteProperty: ['delete-property'] as const,

  // Scraping mutations
  scrapeYad2: ['scrape-yad2'] as const,
  scrapeFacebook: ['scrape-facebook'] as const,

  // Favorite mutations
  addFavorite: ['add-favorite'] as const,
  removeFavorite: ['remove-favorite'] as const,
} as const;

export type MutationKey = typeof MutationKeys;
export type MutationKeyType = MutationKey[keyof MutationKey];

// Export a single object with all keys for convenience
export const QUERY_KEYS = {
  ...QueryKeys,
  mutations: MutationKeys,
} as const;
