export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let normalized = phone.replace(/\D/g, '');
  
  // Handle Israeli phone numbers
  if (normalized.startsWith('972')) {
    // Remove country code
    normalized = normalized.substring(3);
  } else if (normalized.startsWith('+972')) {
    normalized = normalized.substring(4);
  }
  
  // Remove leading zero if present
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  // Ensure it's a valid Israeli mobile/landline length
  if (normalized.length === 9) {
    // Valid Israeli number without country code
    return normalized;
  } else if (normalized.length === 10 && normalized.startsWith('0')) {
    // Has leading zero
    return normalized.substring(1);
  }
  
  // Return original if can't normalize
  return phone;
}

export function formatPhoneNumber(phone: string, format: 'local' | 'international' = 'local'): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 9) {
    return phone; // Can't format, return original
  }
  
  if (format === 'international') {
    return `+972-${normalized.substring(0, 2)}-${normalized.substring(2, 5)}-${normalized.substring(5)}`;
  } else {
    // Local format
    const prefix = normalized.substring(0, 2);
    
    // Mobile numbers
    if (['50', '51', '52', '53', '54', '55', '58'].includes(prefix)) {
      return `0${prefix}-${normalized.substring(2, 5)}-${normalized.substring(5)}`;
    }
    
    // Landline numbers (2-digit area code)
    if (['02', '03', '04', '08', '09'].includes('0' + prefix[0])) {
      return `0${prefix[0]}-${normalized.substring(1, 4)}-${normalized.substring(4)}`;
    }
    
    // Landline numbers (3-digit area code)
    return `0${normalized.substring(0, 2)}-${normalized.substring(2, 5)}-${normalized.substring(5)}`;
  }
}

export function comparePhoneNumbers(phone1: string, phone2: string): boolean {
  return normalizePhoneNumber(phone1) === normalizePhoneNumber(phone2);
}