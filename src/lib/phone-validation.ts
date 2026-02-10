import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

/**
 * Validates a phone number using Google's libphonenumber library
 * @param phoneNumber - The phone number string to validate
 * @param defaultCountry - Optional default country code (e.g., 'MY' for Malaysia)
 * @returns Object with isValid boolean and error message string
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry?: string
): { isValid: boolean; error?: string } {
  // Check if phone number is empty
  if (!phoneNumber || !phoneNumber.trim()) {
    return {
      isValid: false,
      error: 'Phone number is required',
    };
  }

  const trimmedPhone = phoneNumber.trim();

  // Try to validate the phone number
  try {
    // If default country is provided, use it; otherwise let the library auto-detect
    const isValid = defaultCountry
      ? isValidPhoneNumber(trimmedPhone, defaultCountry as any)
      : isValidPhoneNumber(trimmedPhone);

    if (!isValid) {
      // Try to parse to get more specific error information
      try {
        const parsed = defaultCountry
          ? parsePhoneNumber(trimmedPhone, defaultCountry as any)
          : parsePhoneNumber(trimmedPhone);

        return {
          isValid: false,
          error: `Please enter a valid phone number. Example: ${parsed.formatInternational()}`,
        };
      } catch {
        return {
          isValid: false,
          error: 'Please enter a valid international phone number (e.g., +60 12-345-6789)',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    // If parsing fails, return a generic error
    return {
      isValid: false,
      error: 'Please enter a valid international phone number (e.g., +60 12-345-6789)',
    };
  }
}

/**
 * Formats a phone number to international format
 * @param phoneNumber - The phone number string to format
 * @param defaultCountry - Optional default country code
 * @returns Formatted phone number string or original if formatting fails
 */
export function formatPhoneNumber(
  phoneNumber: string,
  defaultCountry?: string
): string {
  if (!phoneNumber || !phoneNumber.trim()) {
    return phoneNumber;
  }

  try {
    const parsed = defaultCountry
      ? parsePhoneNumber(phoneNumber.trim(), defaultCountry as any)
      : parsePhoneNumber(phoneNumber.trim());

    return parsed.formatInternational();
  } catch {
    return phoneNumber;
  }
}
