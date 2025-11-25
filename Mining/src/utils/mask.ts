/**
 * Masks sensitive information in strings for console output
 * Protects: transaction signatures, wallet addresses, RPC URLs, private keys
 *
 * Shows first 6 characters followed by asterisks (******)
 * Example: AaBbCcDdEe... becomes AaBbCc******
 */

/**
 * Mask a single sensitive value (address, signature, URL, etc.)
 * @param value The sensitive value to mask
 * @param prefixLength Number of characters to show before masking (default: 6)
 * @returns Masked string showing prefix + ******
 */
export function maskValue(value: string, prefixLength: number = 6): string {
  if (!value || value.length <= prefixLength) {
    return '******'; // Too short, fully mask
  }
  return value.substring(0, prefixLength) + '******';
}

/**
 * Mask Solana addresses (base58, typically 32-44 chars)
 * Detects patterns like: DYw8j...xyz or wallet addresses
 */
function maskAddresses(text: string): string {
  // Match base58 strings that look like Solana addresses (32-44 chars)
  // Solana addresses are base58 encoded and typically 32-44 characters
  const addressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
  return text.replace(addressRegex, (match) => maskValue(match, 6));
}

/**
 * Mask transaction signatures (base58, typically 87-88 chars)
 */
function maskSignatures(text: string): string {
  // Match base58 strings that look like transaction signatures (longer than addresses)
  const signatureRegex = /\b[1-9A-HJ-NP-Za-km-z]{64,}\b/g;
  return text.replace(signatureRegex, (match) => maskValue(match, 6));
}

/**
 * Mask HTTP(S) URLs (especially RPC endpoints)
 */
function maskUrls(text: string): string {
  // Match http:// or https:// URLs
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.replace(urlRegex, (match) => {
    // For URLs, show protocol + first few chars of domain
    const protocolEnd = match.indexOf('://') + 3;
    const protocol = match.substring(0, protocolEnd);
    const rest = match.substring(protocolEnd);
    if (rest.length <= 10) {
      return protocol + '******';
    }
    return protocol + rest.substring(0, 6) + '******';
  });
}

/**
 * Main masking function - applies all masking rules
 * Only masks if incognito mode is enabled
 *
 * @param text The text to potentially mask
 * @param incognitoMode Whether to apply masking
 * @returns Masked or original text based on incognito mode setting
 */
export function maskSensitiveData(text: string, incognitoMode: boolean = false): string {
  // Only mask if incognito mode is enabled
  if (!incognitoMode) {
    return text;
  }

  let masked = text;

  // Apply masking in order: signatures first (longer), then addresses, then URLs
  // This prevents addresses from being partially matched before signatures
  masked = maskSignatures(masked);
  masked = maskAddresses(masked);
  masked = maskUrls(masked);

  return masked;
}

/**
 * Helper to mask a specific value explicitly (for use in code)
 * Always masks regardless of incognito mode setting
 */
export function alwaysMask(value: string | undefined | null, prefixLength: number = 6): string {
  if (!value) return '******';
  return maskValue(value, prefixLength);
}
