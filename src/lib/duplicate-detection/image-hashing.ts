import { createHash } from 'crypto';
import sharp from 'sharp';

interface ImageHashes {
  phash: string;
  dhash: string;
  averageHash: string;
}

export async function computeImageHashes(imageUrl: string): Promise<ImageHashes> {
  try {
    // Skip non-image URLs
    if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && !imageUrl.includes('image')) {
      return { phash: '', dhash: '', averageHash: '' };
    }

    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      return { phash: '', dhash: '', averageHash: '' };
    }

    const buffer = await response.arrayBuffer();

    // Convert to grayscale and resize for hashing
    const imageBuffer = await sharp(Buffer.from(buffer))
      .grayscale()
      .resize(32, 32, { fit: 'fill' })
      .raw()
      .toBuffer();

    return {
      phash: await computePerceptualHash(imageBuffer),
      dhash: computeDifferenceHash(imageBuffer),
      averageHash: computeAverageHash(imageBuffer),
    };
  } catch (error) {
    console.error('Error computing image hashes:', error);
    // Return empty hashes on error
    return {
      phash: '',
      dhash: '',
      averageHash: '',
    };
  }
}

async function computePerceptualHash(pixels: Buffer): Promise<string> {
  // DCT-based perceptual hash
  const size = 32;
  const smallerSize = 8;

  // Apply DCT
  const dct = applyDCT(pixels, size);

  // Get top-left 8x8
  const subsetDCT = [];
  for (let y = 0; y < smallerSize; y++) {
    for (let x = 0; x < smallerSize; x++) {
      subsetDCT.push(dct[y * size + x]);
    }
  }

  // Calculate median
  const sorted = [...subsetDCT].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Generate hash
  let hash = '';
  for (let i = 0; i < subsetDCT.length; i++) {
    hash += subsetDCT[i] > median ? '1' : '0';
  }

  // Convert to hex
  return parseInt(hash, 2).toString(16).padStart(16, '0');
}

function computeDifferenceHash(pixels: Buffer): string {
  const width = 32;
  const height = 32;
  let hash = '';

  // Compare adjacent pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = y * width + x;
      hash += pixels[idx] > pixels[idx + 1] ? '1' : '0';
    }
  }

  // Convert to hex
  return parseInt(hash.substring(0, 64), 2).toString(16).padStart(16, '0');
}

function computeAverageHash(pixels: Buffer): string {
  // Calculate average pixel value
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) {
    sum += pixels[i];
  }
  const avg = sum / pixels.length;

  // Generate hash
  let hash = '';
  for (let i = 0; i < Math.min(64, pixels.length); i++) {
    hash += pixels[i] > avg ? '1' : '0';
  }

  // Convert to hex
  return parseInt(hash, 2).toString(16).padStart(16, '0');
}

export function compareHashes(hash1: string, hash2: string): number {
  if (!hash1 || !hash2) return 0;

  // Convert hex to binary
  const bin1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
  const bin2 = parseInt(hash2, 16).toString(2).padStart(64, '0');

  // Calculate Hamming distance
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) distance++;
  }

  // Convert to similarity score (0-1)
  return 1 - distance / bin1.length;
}

function applyDCT(pixels: Buffer, size: number): number[] {
  const result = new Array(size * size).fill(0);

  for (let u = 0; u < size; u++) {
    for (let v = 0; v < size; v++) {
      let sum = 0;

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const pixel = pixels[i * size + j];
          sum +=
            pixel *
            Math.cos(((2 * i + 1) * u * Math.PI) / (2 * size)) *
            Math.cos(((2 * j + 1) * v * Math.PI) / (2 * size));
        }
      }

      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;

      result[u * size + v] = (2 / size) * cu * cv * sum;
    }
  }

  return result;
}
