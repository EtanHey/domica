export interface RentalInput {
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  location?: {
    lat: number;
    lng: number;
  };
  address?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  contactName?: string;
  images?: string[];
  amenities?: string[];
  sourcePlatform: 'yad2' | 'facebook' | 'marketplace' | 'other';
  sourceId: string;
  sourceUrl: string;
  metadata?: Record<string, any>;
}

export interface DatabaseRental {
  id: string;
  facebook_id: string; // Using this for any external ID temporarily
  title: string;
  description?: string;
  price_per_month?: number;
  currency: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  location?: any; // PostGIS geography type
  phone_normalized?: string;
  source_platform?: string;
  source_id?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  master_rental_id?: string;
  duplicate_score?: number;
  duplicate_status?: 'unique' | 'master' | 'duplicate' | 'review';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  images?: Array<{
    id: string;
    image_url: string;
    phash?: string;
  }>;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedRental?: DatabaseRental;
  score: number;
  scoreBreakdown?: {
    locationScore: number;
    titleScore: number;
    descriptionScore: number;
    priceScore: number;
    imageScore: number;
    phoneScore: number;
  };
  action: 'create' | 'update' | 'merge' | 'review';
  reviewId?: string;
}

export interface DuplicateReview {
  id: string;
  rental_a_id: string;
  rental_b_id: string;
  score: number;
  score_breakdown: Record<string, number>;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  decision?: string;
  created_at: string;
  reviewed_at?: string;
}

export type MergeStrategy = 
  | 'preserve_complete'    // Keep most complete information
  | 'prefer_recent'       // Prefer most recent data
  | 'accumulate'          // Accumulate all unique data
  | 'manual';             // Require manual review

export interface ImageComparisonResult {
  similarity: number;
  method: 'hash' | 'ai' | 'both';
  confidence: number;
  details?: {
    hashSimilarity?: number;
    aiSimilarity?: number;
    matchedFeatures?: string[];
  };
}