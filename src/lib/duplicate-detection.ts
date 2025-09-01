import { SupabaseClient } from '@supabase/supabase-js';

interface DuplicateCheckOptions {
  enableAIComparison?: boolean;
}

interface PropertyToCheck {
  sourceUrl?: string;
  sourceId?: string;
  sourcePlatform?: string;
  title?: string;
  description?: string;
  price?: number;
  bedrooms?: number;
  locationText?: string;
}

export class DuplicateDetectionService {
  private supabase: SupabaseClient;
  private options: DuplicateCheckOptions;

  constructor(supabase: SupabaseClient, options: DuplicateCheckOptions = {}) {
    this.supabase = supabase;
    this.options = options;
  }

  async checkForDuplicate(
    property: PropertyToCheck
  ): Promise<{ isDuplicate: boolean; matchedProperty?: any }> {
    try {
      // 1. First check for exact sourceId match (most reliable for Facebook posts)
      if (property.sourceId && property.sourcePlatform) {
        const { data: exactMatch, error } = await this.supabase
          .from('properties')
          .select('*')
          .eq('source_id', property.sourceId)
          .eq('source_platform', property.sourcePlatform)
          .single();

        if (exactMatch && !error) {
          console.log(`Found exact duplicate by sourceId: ${property.sourceId}`);
          return { isDuplicate: true, matchedProperty: exactMatch };
        }
      }

      // 2. Check for similar properties based on combination of fields
      // This helps catch duplicates when sourceId might be different
      if (property.title && property.price) {
        const { data: similarProperties, error } = await this.supabase
          .from('properties')
          .select('*')
          .eq('title', property.title)
          .eq('price_per_month', property.price)
          .eq('source_platform', property.sourcePlatform || 'facebook');

        if (similarProperties && similarProperties.length > 0) {
          // For each similar property, check if it's truly a duplicate
          for (const similarProperty of similarProperties) {
            // Check if created recently (within last hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            if (similarProperty.created_at && similarProperty.created_at > oneHourAgo) {
              // Second level check: Compare more details to ensure it's truly a duplicate
              const descriptionMatch = this.compareDescriptions(
                property.description,
                similarProperty.description
              );
              const locationMatch =
                property.locationText === similarProperty.location_text ||
                (!property.locationText && !similarProperty.location_text);
              const bedroomsMatch =
                property.bedrooms === similarProperty.bedrooms ||
                (!property.bedrooms && !similarProperty.bedrooms);

              // Consider it a duplicate only if at least 2 of these match
              const matchCount = [descriptionMatch, locationMatch, bedroomsMatch].filter(
                Boolean
              ).length;

              if (matchCount >= 2) {
                console.log(
                  `Found similar duplicate by title+price with ${matchCount}/3 additional matches: ${property.title}`
                );
                return { isDuplicate: true, matchedProperty: similarProperty };
              } else {
                console.log(
                  `Similar property found but only ${matchCount}/3 additional fields match - not a duplicate`
                );
              }
            }
          }
        }
      }

      // 3. No duplicates found
      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // On error, return false to allow insertion
      return { isDuplicate: false };
    }
  }

  // Helper method to compare descriptions (check if they're similar enough)
  private compareDescriptions(desc1?: string, desc2?: string): boolean {
    if (!desc1 || !desc2) return false;

    // Remove whitespace and punctuation for comparison
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalized1 = normalize(desc1);
    const normalized2 = normalize(desc2);

    // Check if they're very similar (at least 80% of the shorter one is contained in the longer one)
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
    const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;

    // Simple substring check - could be enhanced with fuzzy matching
    const words1 = shorter.split(' ');
    const words2 = longer.split(' ');

    const matchingWords = words1.filter((word) => words2.includes(word)).length;
    const similarity = matchingWords / words1.length;

    return similarity > 0.7; // 70% word similarity threshold
  }
}
