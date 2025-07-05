import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { openai } from '@/lib/openai';
import { computeImageHashes, compareHashes } from './image-hashing';
import { normalizePhoneNumber } from './phone-utils';
import { calculateTextSimilarity } from './text-similarity';
import { DatabaseRental, RentalInput, DuplicateCheckResult, MergeStrategy } from './types';

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

  async checkForDuplicate(rental: RentalInput): Promise<DuplicateCheckResult> {
    // Phase 1: Check for exact source match
    const exactMatch = await this.checkExactSourceMatch(rental);
    if (exactMatch) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedRental: exactMatch,
        score: 100,
        action: 'update',
      };
    }

    // Phase 2: Find nearby candidates
    const candidates = await this.findNearbyCandidates(rental);
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
      candidates.map((candidate) => this.calculateSimilarityScore(rental, candidate))
    );

    // Phase 4: Determine best match
    const bestMatch = scores.sort((a, b) => b.totalScore - a.totalScore)[0];

    if (bestMatch.totalScore >= DUPLICATE_THRESHOLD) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedRental: bestMatch.rental,
        score: bestMatch.totalScore,
        scoreBreakdown: bestMatch.breakdown,
        action: 'merge',
      };
    }

    if (bestMatch.totalScore >= REVIEW_THRESHOLD) {
      // Queue for manual/AI review
      const reviewId = await this.queueForReview(rental, bestMatch);
      return {
        isDuplicate: false,
        confidence: 'medium',
        matchedRental: bestMatch.rental,
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

  private async checkExactSourceMatch(rental: RentalInput): Promise<DatabaseRental | null> {
    const { data } = await this.supabase
      .from('rentals')
      .select(
        `
        *,
        images:rental_images(id, image_url, phash)
      `
      )
      .eq('source_platform', rental.sourcePlatform)
      .eq('source_id', rental.sourceId)
      .is('deleted_at', null)
      .single();

    if (data) {
      return {
        ...data,
        images: (data as any).images || [],
      } as DatabaseRental;
    }
    return null;
  }

  private async findNearbyCandidates(rental: RentalInput): Promise<DatabaseRental[]> {
    // For now, without PostGIS, we'll search by location text and title similarity
    // In production, you'd use the PostGIS function after running the migration

    const { data } = await this.supabase
      .from('rentals')
      .select(
        `
        *,
        images:rental_images(id, image_url, phash)
      `
      )
      .is('deleted_at', null)
      .limit(100);

    if (!data) return [];

    // Filter by location text similarity or title similarity
    return data
      .filter((r) => {
        if (rental.address && r.location_text) {
          // Simple text matching for now
          const rentalLocation = rental.address.toLowerCase();
          const existingLocation = ((r.location_text as string) || '').toLowerCase();

          // Check if they share common location keywords
          const rentalWords = rentalLocation.split(/[\s,]+/).filter((w: string) => w.length > 2);
          const existingWords = existingLocation
            .split(/[\s,]+/)
            .filter((w: string) => w.length > 2);

          const commonWords = rentalWords.filter((w) => existingWords.includes(w));
          return commonWords.length >= 2; // At least 2 common words
        }
        return false;
      })
      .map((r) => ({
        ...r,
        images: (r as any).images || [],
      })) as DatabaseRental[];
  }

  private async calculateSimilarityScore(newRental: RentalInput, existingRental: DatabaseRental) {
    const breakdown = {
      locationScore: 0,
      titleScore: 0,
      descriptionScore: 0,
      priceScore: 0,
      imageScore: 0,
      phoneScore: 0,
    };

    // Location scoring (max 40 points)
    if (newRental.location && existingRental.location) {
      const distance = this.calculateDistance(newRental.location, existingRental.location);
      if (distance < 1) breakdown.locationScore = 40;
      else if (distance < 10) breakdown.locationScore = 35;
      else if (distance < 50) breakdown.locationScore = 25;
      else if (distance < 100) breakdown.locationScore = 15;
      else if (distance < 200) breakdown.locationScore = 5;
    } else if (newRental.address && existingRental.location_text) {
      // Fallback to text-based location matching
      const locationSimilarity = await calculateTextSimilarity(
        newRental.address,
        existingRental.location_text,
        'hebrew'
      );
      breakdown.locationScore = Math.round(locationSimilarity * 40);
    }

    // Title similarity (max 20 points)
    if (newRental.title && existingRental.title) {
      const titleSimilarity = await calculateTextSimilarity(
        newRental.title,
        existingRental.title,
        'hebrew'
      );
      breakdown.titleScore = Math.round(titleSimilarity * 20);
    }

    // Description similarity (max 15 points)
    if (newRental.description && existingRental.description) {
      const descSimilarity = await calculateTextSimilarity(
        newRental.description,
        existingRental.description,
        'hebrew'
      );
      breakdown.descriptionScore = Math.round(descSimilarity * 15);
    }

    // Price similarity (max 10 points)
    const rentalPrice = newRental.price;
    const existingPrice = existingRental.price_per_month;
    if (rentalPrice && existingPrice) {
      const priceDiff = Math.abs(rentalPrice - existingPrice);
      const priceRatio = priceDiff / Math.max(rentalPrice, existingPrice);
      if (priceRatio < 0.05) breakdown.priceScore = 10;
      else if (priceRatio < 0.1) breakdown.priceScore = 7;
      else if (priceRatio < 0.2) breakdown.priceScore = 3;
    }

    // Image similarity (max 30 points)
    if (newRental.images?.length && existingRental.images?.length) {
      breakdown.imageScore = await this.compareImages(newRental.images, existingRental.images);
    }

    // Phone similarity (max 20 points)
    if (newRental.phone && existingRental.phone_normalized) {
      const normalizedNew = normalizePhoneNumber(newRental.phone);
      if (normalizedNew === existingRental.phone_normalized) {
        breakdown.phoneScore = 20;
      }
    }

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
      rental: existingRental,
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

  async mergeRentals(
    masterId: string,
    duplicateRental: RentalInput,
    strategy: MergeStrategy = 'preserve_complete'
  ): Promise<void> {
    const { data: master } = await this.supabase
      .from('rentals')
      .select('*')
      .eq('id', masterId)
      .single();

    if (!master) throw new Error('Master rental not found');

    const updates: Partial<DatabaseRental> = {};
    const mergedFields: string[] = [];

    // Title: Keep longer, more descriptive
    if (
      duplicateRental.title &&
      master.title &&
      duplicateRental.title.length > (master.title as string).length
    ) {
      updates.title = duplicateRental.title;
      mergedFields.push('title');
    }

    // Description: Keep longer or more complete
    if (
      duplicateRental.description &&
      (!master.description ||
        duplicateRental.description.length > ((master.description as string) || '').length)
    ) {
      updates.description = duplicateRental.description;
      mergedFields.push('description');
    }

    // Price: Always update to latest
    if (duplicateRental.price && duplicateRental.price !== master.price_per_month) {
      updates.price_per_month = duplicateRental.price;
      mergedFields.push('price');
    }

    // Location: Update if more precise
    if (duplicateRental.location && !master.location) {
      updates.location = `POINT(${duplicateRental.location.lng} ${duplicateRental.location.lat})`;
      mergedFields.push('location');
    }

    // Phone: Update if missing
    if (duplicateRental.phone && !master.phone_normalized) {
      (updates as any).phone_original = duplicateRental.phone;
      updates.phone_normalized = normalizePhoneNumber(duplicateRental.phone);
      mergedFields.push('phone');
    }

    // Update last seen
    updates.last_seen_at = new Date().toISOString();

    // Perform the update
    await this.supabase.from('rentals').update(updates).eq('id', masterId);

    // Merge images (deduplicated)
    if (duplicateRental.images?.length) {
      await this.mergeImages(masterId, duplicateRental.images);
    }

    // Record merge history
    await this.supabase.from('rental_merge_history').insert({
      master_rental_id: masterId,
      merged_fields: mergedFields,
      merge_reason: 'duplicate_detected',
      previous_values: this.extractPreviousValues(
        master as unknown as DatabaseRental,
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

  private async queueForReview(rental: RentalInput, bestMatch: any): Promise<string> {
    const { data } = await this.supabase
      .from('duplicate_reviews')
      .insert({
        rental_data: rental,
        matched_rental_id: bestMatch.rental.id,
        score: bestMatch.totalScore,
        score_breakdown: bestMatch.breakdown,
        status: 'pending',
      })
      .select('id')
      .single();

    return (data?.id as string) || '';
  }

  private async mergeImages(rentalId: string, newImages: string[]): Promise<void> {
    // Get existing images
    const { data: existingImages } = await this.supabase
      .from('rental_images')
      .select('image_url, phash')
      .eq('rental_id', rentalId);

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
          rental_id: rentalId,
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
      await this.supabase.from('rental_images').insert(uniqueNewImages);
    }
  }

  private extractPreviousValues(rental: DatabaseRental, fields: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    for (const field of fields) {
      values[field] = rental[field as keyof DatabaseRental];
    }
    return values;
  }
}
