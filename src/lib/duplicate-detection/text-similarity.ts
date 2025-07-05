import { distance as levenshteinDistance } from 'fastest-levenshtein';

export async function calculateTextSimilarity(
  text1: string,
  text2: string,
  language: 'hebrew' | 'english' = 'hebrew'
): Promise<number> {
  // Normalize texts
  const normalized1 = normalizeText(text1, language);
  const normalized2 = normalizeText(text2, language);
  
  // If texts are identical after normalization
  if (normalized1 === normalized2) return 1;
  
  // Calculate multiple similarity metrics
  const metrics = [
    levenshteinSimilarity(normalized1, normalized2),
    jaccardSimilarity(normalized1, normalized2),
    tokenOverlapSimilarity(normalized1, normalized2, language),
    lengthSimilarity(normalized1, normalized2)
  ];
  
  // Weighted average of metrics
  const weights = [0.3, 0.3, 0.3, 0.1];
  const weightedScore = metrics.reduce((sum, score, i) => sum + score * weights[i], 0);
  
  return Math.min(1, weightedScore);
}

function normalizeText(text: string, language: 'hebrew' | 'english'): string {
  let normalized = text.toLowerCase().trim();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove common punctuation
  normalized = normalized.replace(/[.,!?;:'"״׳]/g, '');
  
  if (language === 'hebrew') {
    // Hebrew-specific normalization
    // Remove niqqud (vowel marks)
    normalized = normalized.replace(/[\u0591-\u05C7]/g, '');
    
    // Normalize common Hebrew abbreviations
    normalized = normalized
      .replace(/דירת? (\d+)/, 'דירה $1 חדרים')
      .replace(/חד'/, 'חדרים')
      .replace(/מ"ר/, 'מטר רבוע')
      .replace(/ק"ג/, 'קילוגרם');
  }
  
  return normalized;
}

function levenshteinSimilarity(text1: string, text2: string): number {
  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  return 1 - (distance / maxLength);
}

function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.split(' '));
  const set2 = new Set(text2.split(' '));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function tokenOverlapSimilarity(
  text1: string, 
  text2: string,
  language: 'hebrew' | 'english'
): number {
  const tokens1 = tokenize(text1, language);
  const tokens2 = tokenize(text2, language);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  // Count overlapping tokens
  const tokenMap = new Map<string, number>();
  tokens1.forEach(token => tokenMap.set(token, (tokenMap.get(token) || 0) + 1));
  
  let overlap = 0;
  tokens2.forEach(token => {
    const count = tokenMap.get(token);
    if (count && count > 0) {
      overlap++;
      tokenMap.set(token, count - 1);
    }
  });
  
  // Normalize by average length
  return (2 * overlap) / (tokens1.length + tokens2.length);
}

function tokenize(text: string, language: 'hebrew' | 'english'): string[] {
  // Basic word tokenization
  let tokens = text.split(/\s+/).filter(token => token.length > 0);
  
  if (language === 'hebrew') {
    // Filter out very short tokens (likely particles)
    tokens = tokens.filter(token => token.length > 1);
    
    // Remove common stop words
    const hebrewStopWords = new Set([
      'של', 'את', 'על', 'עם', 'אל', 'מן', 'בין', 'לא', 'כל', 'גם', 'רק',
      'יש', 'אין', 'זה', 'זאת', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'את'
    ]);
    tokens = tokens.filter(token => !hebrewStopWords.has(token));
  } else {
    // English stop words
    const englishStopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'have', 'has'
    ]);
    tokens = tokens.filter(token => !englishStopWords.has(token));
  }
  
  return tokens;
}

function lengthSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;
  const maxLen = Math.max(len1, len2);
  const minLen = Math.min(len1, len2);
  
  return minLen / maxLen;
}

// Fuzzy matching for specific fields
export function fuzzyMatchAddress(addr1: string, addr2: string): number {
  // Normalize addresses
  const norm1 = addr1.toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF]/g, '') // Keep Hebrew chars
    .replace(/\s+/g, ' ')
    .trim();
    
  const norm2 = addr2.toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract components (street, number, city)
  const components1 = extractAddressComponents(norm1);
  const components2 = extractAddressComponents(norm2);
  
  let score = 0;
  
  // Street name similarity (most important)
  if (components1.street && components2.street) {
    score += levenshteinSimilarity(components1.street, components2.street) * 0.5;
  }
  
  // Building number exact match
  if (components1.number && components2.number && components1.number === components2.number) {
    score += 0.3;
  }
  
  // City similarity
  if (components1.city && components2.city) {
    score += levenshteinSimilarity(components1.city, components2.city) * 0.2;
  }
  
  return score;
}

function extractAddressComponents(address: string) {
  // Simple extraction - can be improved with proper parsing
  const numberMatch = address.match(/\d+/);
  const number = numberMatch ? numberMatch[0] : null;
  
  // Remove number from address to get street/city
  const withoutNumber = address.replace(/\d+/g, '').trim();
  const parts = withoutNumber.split(/[,،]/); // Include Arabic comma
  
  return {
    number,
    street: parts[0]?.trim() || null,
    city: parts[1]?.trim() || null
  };
}