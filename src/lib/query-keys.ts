// Centralized query keys for TanStack Query
// This ensures type safety and prevents typos across the application

export const QueryKeys = {
  // Rental queries
  rentals: {
    all: ['rentals'] as const,
    list: (filters?: { city?: string; minRooms?: number; maxPrice?: number }) =>
      ['rentals', 'list', filters] as const,
    detail: (id: string) => ['rentals', 'detail', id] as const,
    images: (rentalId: string) => ['rentals', 'images', rentalId] as const,
  },

  // Landlord queries
  landlords: {
    all: ['landlords'] as const,
    detail: (id: string) => ['landlords', 'detail', id] as const,
    rentals: (landlordId: string) => ['landlords', 'rentals', landlordId] as const,
  },

  // Amenities queries
  amenities: {
    all: ['amenities'] as const,
    byRental: (rentalId: string) => ['amenities', 'rental', rentalId] as const,
  },

  // Price history queries
  priceHistory: {
    byRental: (rentalId: string) => ['price-history', 'rental', rentalId] as const,
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
export type RentalQueryKey =
  | typeof QueryKeys.rentals.all
  | ReturnType<typeof QueryKeys.rentals.list>
  | ReturnType<typeof QueryKeys.rentals.detail>
  | ReturnType<typeof QueryKeys.rentals.images>;

export type LandlordQueryKey =
  | typeof QueryKeys.landlords.all
  | ReturnType<typeof QueryKeys.landlords.detail>
  | ReturnType<typeof QueryKeys.landlords.rentals>;

export type AmenityQueryKey =
  | typeof QueryKeys.amenities.all
  | ReturnType<typeof QueryKeys.amenities.byRental>;

export type ScrapingQueryKey =
  | ReturnType<typeof QueryKeys.scraping.yad2>
  | ReturnType<typeof QueryKeys.scraping.facebook>
  | ReturnType<typeof QueryKeys.scraping.status>;

export type SearchQueryKey =
  | ReturnType<typeof QueryKeys.search.locations>
  | ReturnType<typeof QueryKeys.search.suggestions>;

// Mutation keys for mutations that need to be tracked
export const MutationKeys = {
  // Rental mutations
  createRental: ['create-rental'] as const,
  updateRental: ['update-rental'] as const,
  deleteRental: ['delete-rental'] as const,

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
