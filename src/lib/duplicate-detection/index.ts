import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { openai } from '@/lib/openai';
import { computeImageHashes, compareHashes } from './image-hashing';
import { normalizePhoneNumber } from './phone-utils';
import { calculateTextSimilarity } from './text-similarity';
import { DatabaseProperty, PropertyInput, DuplicateCheckResult, MergeStrategy } from './types';

const DUPLICATE_THRESHOLD = 85;
const REVIEW_THRESHOLD = 65;
const UNIQUE_THRESHOLD = 40;

export class DuplicateDetectionService {
  constructor(
    private supabase: ReturnType<typeof createClient>,
    private config: {
      enableAIComparison?: boolean;
      aiComparisonThreshold?: number;
      maxCandidateRadius?: number;
    } = {}
  ) {
    this.config = {
      enableAIComparison: true,
      aiComparisonThreshold: 0.75,
      maxCandidateRadius: 200, // meters
      ...config,
    };
  }

  async checkForDuplicate(property: PropertyInput): Promise<DuplicateCheckResult> {
    // Phase 1: Check for exact source URL match first (most efficient)
    // Only check if we have a valid listing URL (not a search URL)
    if (property.sourceUrl && property.sourceUrl.includes('/item/')) {
      const urlMatch = await this.checkSourceUrlMatch(property.sourceUrl);
      if (urlMatch) {
        return {
          isDuplicate: true,
          confidence: 'high',
          matchedProperty: urlMatch,
          score: 100,
          action: 'update',
        };
      }
    }

    // Phase 2: Check for exact source platform + ID match
    const exactMatch = await this.checkExactSourceMatch(property);
    if (exactMatch) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedProperty: exactMatch,
        score: 100,
        action: 'update',
      };
    }

    // Phase 2: Find nearby candidates
    const candidates = await this.findNearbyCandidates(property);
    if (candidates.length === 0) {
      return {
        isDuplicate: false,
        confidence: 'high',
        score: 0,
        action: 'create',
      };
    }

    // Phase 3: Score each candidate
    const scores = await Promise.all(
      candidates.map((candidate) => this.calculateSimilarityScore(property, candidate))
    );

    // Phase 4: Determine best match
    const bestMatch = scores.sort((a, b) => b.totalScore - a.totalScore)[0];

    if (bestMatch.totalScore >= DUPLICATE_THRESHOLD) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedProperty: bestMatch.property,
        score: bestMatch.totalScore,
        scoreBreakdown: bestMatch.breakdown,
        action: 'merge',
      };
    }

    if (bestMatch.totalScore >= REVIEW_THRESHOLD) {
      // Queue for manual/AI review
      const reviewId = await this.queueForReview(property, bestMatch);
      return {
        isDuplicate: false,
        confidence: 'medium',
        matchedProperty: bestMatch.property,
        score: bestMatch.totalScore,
        scoreBreakdown: bestMatch.breakdown,
        action: 'review',
        reviewId,
      };
    }

    return {
      isDuplicate: false,
      confidence: 'high',
      score: bestMatch.totalScore,
      action: 'create',
    };
  }

  private async checkSourceUrlMatch(sourceUrl: string): Promise<DatabaseProperty | null> {
    // Normalize the URL by removing query parameters and fragments
    const normalizedUrl = this.normalizeUrl(sourceUrl);

    const { data } = await this.supabase
      .from('properties')
      .select(
        `
        *,
        images:property_images(id, image_url, phash)
      `
      )
      .eq('source_url', normalizedUrl)
      .is('deleted_at', null)
      .single();

    if (data) {
      return {
        ...data,
        images: (data as any).images || [],
      } as DatabaseProperty;
    }
    return null;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // For Yad2, we want to keep only the base URL without query params
      // This handles URLs like: https://www.yad2.co.il/realestate/item/go77ks4g?opened-from=feed&component-type=main_feed
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  private async checkExactSourceMatch(property: PropertyInput): Promise<DatabaseProperty | null> {
    const { data } = await this.supabase
      .from('properties')
      .select(
        `
        *,
        images:property_images(id, image_url, phash)
      `
      )
      .eq('source_platform', property.sourcePlatform)
      .eq('source_id', property.sourceId)
      .is('deleted_at', null)
      .single();

    if (data) {
      return {
        ...data,
        images: (data as any).images || [],
      } as DatabaseProperty;
    }
    return null;
  }

  private async findNearbyCandidates(property: PropertyInput): Promise<DatabaseProperty[]> {
    // For now, without PostGIS, we'll search by location text and title similarity
    // In production, you'd use the PostGIS function after running the migration

    const { data } = await this.supabase
      .from('properties')
      .select(
        `
        *,
        images:property_images(id, image_url, phash)
      `
      )
      .is('deleted_at', null)
      .limit(100);

    if (!data) return [];

    // Filter by location text similarity or title similarity
    return data
      .filter((r) => {
        if (property.address && r.location_text) {
          // Simple text matching for now
          const propertyLocation = property.address.toLowerCase();
          const existingLocation = ((r.location_text as string) || '').toLowerCase();

          // Check if they share common location keywords
          const propertyWords = propertyLocation
            .split(/[\s,]+/)
            .filter((w: string) => w.length > 2);
          const existingWords = existingLocation
            .split(/[\s,]+/)
            .filter((w: string) => w.length > 2);

          const commonWords = propertyWords.filter((w) => existingWords.includes(w));
          return commonWords.length >= 2; // At least 2 common words
        }
        return false;
      })
      .map((r) => ({
        ...r,
        images: (r as any).images || [],
      })) as DatabaseProperty[];
  }

  private async calculateSimilarityScore(
    newProperty: PropertyInput,
    existingProperty: DatabaseProperty
  ) {
    const breakdown = {
      locationScore: 0,
      titleScore: 0,
      descriptionScore: 0,
      priceScore: 0,
      imageScore: 0,
      phoneScore: 0,
    };

    // Location scoring (max 40 points)
    if (newProperty.location && existingProperty.location) {
      const distance = this.calculateDistance(newProperty.location, existingProperty.location);
      if (distance < 1) breakdown.locationScore = 40;
      else if (distance < 10) breakdown.locationScore = 35;
      else if (distance < 50) breakdown.locationScore = 25;
      else if (distance < 100) breakdown.locationScore = 15;
      else if (distance < 200) breakdown.locationScore = 5;
    } else if (newProperty.address && existingProperty.location_text) {
      // Fallback to text-based location matching
      const locationSimilarity = await calculateTextSimilarity(
        newProperty.address,
        existingProperty.location_text,
        'hebrew'
      );
      breakdown.locationScore = Math.round(locationSimilarity * 40);
    }

    // Title similarity (max 20 points)
    if (newProperty.title && existingProperty.title) {
      const titleSimilarity = await calculateTextSimilarity(
        newProperty.title,
        existingProperty.title,
        'hebrew'
      );
      breakdown.titleScore = Math.round(titleSimilarity * 20);
    }

    // Description similarity (max 15 points)
    if (newProperty.description && existingProperty.description) {
      const descSimilarity = await calculateTextSimilarity(
        newProperty.description,
        existingProperty.description,
        'hebrew'
      );
      breakdown.descriptionScore = Math.round(descSimilarity * 15);
    }

    // Price similarity (max 10 points)
    const propertyPrice = newProperty.price;
    const existingPrice = existingProperty.price_per_month;
    if (propertyPrice && existingPrice) {
      const priceDiff = Math.abs(propertyPrice - existingPrice);
      const priceRatio = priceDiff / Math.max(propertyPrice, existingPrice);
      if (priceRatio < 0.05) breakdown.priceScore = 10;
      else if (priceRatio < 0.1) breakdown.priceScore = 7;
      else if (priceRatio < 0.2) breakdown.priceScore = 3;
    }

    // Image similarity (max 30 points)
    if (newProperty.images?.length && existingProperty.images?.length) {
      breakdown.imageScore = await this.compareImages(newProperty.images, existingProperty.images);
    }

    // Phone similarity (max 20 points)
    if (newProperty.phone && existingProperty.phone_normalized) {
      const normalizedNew = normalizePhoneNumber(newProperty.phone);
      if (normalizedNew === existingProperty.phone_normalized) {
        breakdown.phoneScore = 20;
      }
    }

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
      property: existingProperty,
      totalScore,
      breakdown,
    };
  }

  private async compareImages(
    newImages: string[],
    existingImages: Array<{ image_url: string; phash?: string }>
  ): Promise<number> {
    let maxScore = 0;

    // First try perceptual hashing
    for (const newImage of newImages) {
      const newHash = await computeImageHashes(newImage);

      for (const existingImage of existingImages) {
        let similarity = 0;

        if (existingImage.phash) {
          similarity = compareHashes(newHash.phash, existingImage.phash);
        } else {
          const existingHash = await computeImageHashes(existingImage.image_url);
          similarity = compareHashes(newHash.phash, existingHash.phash);
        }

        // If hashes are very similar, it's likely the same image
        if (similarity > 0.95) return 30;
        if (similarity > 0.85) maxScore = Math.max(maxScore, 25);

        // For medium similarity, use AI if enabled
        if (
          similarity > (this.config.aiComparisonThreshold || 0.75) &&
          this.config.enableAIComparison
        ) {
          const aiScore = await this.compareImagesWithAI(newImage, existingImage.image_url);
          maxScore = Math.max(maxScore, aiScore);
        }
      }
    }

    return Math.min(maxScore, 30);
  }

  private async compareImagesWithAI(imageA: string, imageB: string): Promise<number> {
    try {
      const response = await openai.chat.completions.create();

      const content = response.choices[0]?.message?.content;
      const confidence = content ? parseInt(content) : 0;
      return Math.round((confidence / 100) * 30); // Convert to our 0-30 scale
    } catch (error) {
      console.error('AI image comparison failed:', error);
      return 0;
    }
  }

  async mergeProperties(
    masterId: string,
    duplicateProperty: PropertyInput,
    strategy: MergeStrategy = 'preserve_complete'
  ): Promise<void> {
    const { data: master } = await this.supabase
      .from('properties')
      .select('*')
      .eq('id', masterId)
      .single();

    if (!master) throw new Error('Master property not found');

    const updates: Partial<DatabaseProperty> = {};
    const mergedFields: string[] = [];

    // Title: Keep longer, more descriptive
    if (
      duplicateProperty.title &&
      master.title &&
      duplicateProperty.title.length > (master.title as string).length
    ) {
      updates.title = duplicateProperty.title;
      mergedFields.push('title');
    }

    // Description: Keep longer or more complete
    if (
      duplicateProperty.description &&
      (!master.description ||
        duplicateProperty.description.length > ((master.description as string) || '').length)
    ) {
      updates.description = duplicateProperty.description;
      mergedFields.push('description');
    }

    // Price: Always update to latest
    if (duplicateProperty.price && duplicateProperty.price !== master.price_per_month) {
      updates.price_per_month = duplicateProperty.price;
      mergedFields.push('price');
    }

    // Location: Update if more precise
    if (duplicateProperty.location && !master.location) {
      updates.location = `POINT(${duplicateProperty.location.lng} ${duplicateProperty.location.lat})`;
      mergedFields.push('location');
    }

    // Phone: Update if missing
    if (duplicateProperty.phone && !master.phone_normalized) {
      (updates as any).phone_original = duplicateProperty.phone;
      updates.phone_normalized = normalizePhoneNumber(duplicateProperty.phone);
      mergedFields.push('phone');
    }

    // Update last seen
    updates.last_seen_at = new Date().toISOString();

    // Perform the update
    await this.supabase.from('properties').update(updates).eq('id', masterId);

    // Merge images (deduplicated)
    if (duplicateProperty.images?.length) {
      await this.mergeImages(masterId, duplicateProperty.images);
    }

    // Record merge history
    await this.supabase.from('property_merge_history').insert({
      master_property_id: masterId,
      merged_fields: mergedFields,
      merge_reason: 'duplicate_detected',
      previous_values: this.extractPreviousValues(
        master as unknown as DatabaseProperty,
        mergedFields
      ),
    });
  }

  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    // Haversine formula for distance in meters
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async queueForReview(property: PropertyInput, bestMatch: any): Promise<string> {
    const { data } = await this.supabase
      .from('duplicate_reviews')
      .insert({
        property_data: property,
        matched_property_id: bestMatch.property.id,
        score: bestMatch.totalScore,
        score_breakdown: bestMatch.breakdown,
        status: 'pending',
      })
      .select('id')
      .single();

    return (data?.id as string) || '';
  }

  private async mergeImages(propertyId: string, newImages: string[]): Promise<void> {
    // Get existing images
    const { data: existingImages } = await this.supabase
      .from('property_images')
      .select('image_url, phash')
      .eq('property_id', propertyId);

    // Filter out duplicate images
    const uniqueNewImages = [];
    let imageOrder = existingImages?.length || 0;

    for (const newImage of newImages) {
      const newHash = await computeImageHashes(newImage);
      const isDuplicate = existingImages?.some((existing) => {
        if (!existing.phash) return false;
        return compareHashes(newHash.phash, (existing.phash as string) || '') > 0.95;
      });

      if (!isDuplicate) {
        uniqueNewImages.push({
          property_id: propertyId,
          image_url: newImage,
          phash: newHash.phash,
          dhash: newHash.dhash,
          average_hash: newHash.averageHash,
          image_order: imageOrder++,
          is_primary: false,
        });
      }
    }

    // Insert unique images
    if (uniqueNewImages.length > 0) {
      await this.supabase.from('property_images').insert(uniqueNewImages);
    }
  }

  private extractPreviousValues(property: DatabaseProperty, fields: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    for (const field of fields) {
      values[field] = property[field as keyof DatabaseProperty];
    }
    return values;
  }
}
