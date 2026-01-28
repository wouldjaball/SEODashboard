/**
 * Password utility functions
 */

// Characters that look similar and can cause confusion
// Excluded: 0, O, o, 1, l, I
const ALPHANUMERIC_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/**
 * Generate a temporary password for new user invitations
 * @param length - Length of the password (default 12)
 * @returns A random alphanumeric password excluding confusing characters
 */
export function generateTempPassword(length: number = 12): string {
  let password = ''
  const charsLength = ALPHANUMERIC_CHARS.length

  // Use crypto for secure random number generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(length)
    crypto.getRandomValues(randomValues)
    for (let i = 0; i < length; i++) {
      password += ALPHANUMERIC_CHARS[randomValues[i] % charsLength]
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      password += ALPHANUMERIC_CHARS[Math.floor(Math.random() * charsLength)]
    }
  }

  return password
}

/**
 * Validate password meets minimum requirements
 * @param password - Password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' }
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' }
  }

  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }

  return { isValid: true }
}
