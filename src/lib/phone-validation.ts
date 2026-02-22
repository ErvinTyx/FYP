import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

/**
 * Validates that a string is a Malaysia mobile number:
 * - 11 digits for 011XXXXXXXX
 * - 10 digits for 01XXXXXXXX (e.g. 012, 016)
 * @param value - Raw input (digits, spaces, dashes, etc. are stripped)
 * @returns Object with isValid and optional error message
 */
export function validateMalaysiaMobilePhone(value: string): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  const digits = value.replace(/\D/g, '');
  const valid =
    (digits.length === 11 && digits.startsWith('011')) ||
    (digits.length === 10 && digits.startsWith('01'));
  if (!valid) {
    return {
      isValid: false,
      error: 'Enter a valid Malaysia phone (e.g. 0123456789 or 01123456789)',
    };
  }
  return { isValid: true };
}

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
