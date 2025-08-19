import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const DEFAULT_COUNTRY = 'KW'; // Kuwait
const DEFAULT_COUNTRY_CODE = '965';

/**
 * Normalize phone number to E.164 format
 * @param {string} phoneNumber - Raw phone number
 * @param {string} defaultCountry - Default country code (default: KW)
 * @returns {Object} - { success: boolean, phone: string, error?: string }
 */
export function normalizePhoneNumber(phoneNumber, defaultCountry = DEFAULT_COUNTRY) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      success: false,
      phone: null,
      error: 'Invalid phone number provided'
    };
  }

  // Clean the phone number
  let cleanPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
  
  // Remove any leading zeros or plus signs
  cleanPhone = cleanPhone.replace(/^[+0]+/, '');

  try {
    let parsedNumber;

    // If number doesn't start with country code, add default
    if (!cleanPhone.startsWith(DEFAULT_COUNTRY_CODE)) {
      cleanPhone = DEFAULT_COUNTRY_CODE + cleanPhone;
    }

    // Add + prefix for parsing
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    // Parse the phone number
    parsedNumber = parsePhoneNumber(cleanPhone);

    if (!parsedNumber) {
      return {
        success: false,
        phone: null,
        error: 'Could not parse phone number'
      };
    }

    // Validate the parsed number
    if (!parsedNumber.isValid()) {
      return {
        success: false,
        phone: null,
        error: 'Invalid phone number format'
      };
    }

    // Return E.164 format without + for WhatsApp
    const e164Number = parsedNumber.number.substring(1); // Remove + prefix

    return {
      success: true,
      phone: e164Number,
      error: null
    };

  } catch (error) {
    console.error('Error normalizing phone number:', error);
    return {
      success: false,
      phone: null,
      error: `Phone number parsing error: ${error.message}`
    };
  }
}

/**
 * Validate phone number
 * @param {string} phoneNumber - Phone number to validate
 * @param {string} defaultCountry - Default country code
 * @returns {boolean} - Is valid phone number
 */
export function validatePhoneNumber(phoneNumber, defaultCountry = DEFAULT_COUNTRY) {
  try {
    return isValidPhoneNumber(phoneNumber, defaultCountry);
  } catch (error) {
    return false;
  }
}

/**
 * Extract all valid phone numbers from contact data
 * @param {Object} contact - Contact object with phone1, phone2, phone3
 * @returns {Array} - Array of normalized phone numbers
 */
export function extractPhoneNumbers(contact) {
  const phones = [];
  const phoneFields = ['phone1', 'phone2', 'phone3'];

  for (const field of phoneFields) {
    if (contact[field]) {
      const result = normalizePhoneNumber(contact[field]);
      if (result.success) {
        phones.push({
          original: contact[field],
          normalized: result.phone,
          field: field
        });
      } else {
        console.warn(`Invalid phone in ${field} for ${contact.name}: ${result.error}`);
      }
    }
  }

  return phones;
}

/**
 * Get the primary phone number from contact
 * @param {Object} contact - Contact object
 * @returns {Object|null} - Primary phone number or null
 */
export function getPrimaryPhone(contact) {
  const phones = extractPhoneNumbers(contact);
  return phones.length > 0 ? phones[0] : null;
}
