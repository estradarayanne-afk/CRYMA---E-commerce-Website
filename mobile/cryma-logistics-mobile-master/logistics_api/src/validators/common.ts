import { z } from 'zod';

// Common validation rules
export const nameRegex = /^[\p{L}\s'\-]+$/u;
export const tinRegex = /^\d{9}$/;
export const licenseNumberRegex = /^[A-Za-z0-9\-]+$/;
export const phoneRegex = /^(09\d{9}|\+639\d{9})$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validators = {
  // Validate name: max 50 chars, Unicode letters/spaces/hyphens/apostrophes
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(50, 'Name must not exceed 50 characters')
    .refine((val) => nameRegex.test(val), 'Name contains invalid characters. Use letters, spaces, hyphens, and apostrophes only.')
    .refine((val) => {
      const letterCount = (val.match(/\p{L}/gu) || []).length;
      return letterCount <= 50;
    }, 'Name must not exceed 50 letters'),

  // Validate email — uses regex to allow non-standard TLDs (e.g. .4evr)
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, 'Email must not exceed 100 characters')
    .refine((val) => emailRegex.test(val), 'Invalid email address'),

  // Validate Philippine mobile number
  phone: z
    .string()
    .trim()
    .refine(
      (val) => phoneRegex.test(val),
      'Phone number must be in format +639XXXXXXXXX or 09XXXXXXXXX (10 digits after 0 or 63)'
    )
    .transform((val) => {
      // Normalize to +639XXXXXXXXX format
      if (val.startsWith('0')) {
        return `+63${val.substring(1)}`;
      }
      return val;
    }),

  // Validate TIN: exactly 9 digits
  tin: z
    .string()
    .trim()
    .max(9, 'TIN must be exactly 9 digits')
    .refine((val) => tinRegex.test(val), 'TIN must be exactly 9 digits with no letters or special characters'),

  // Validate password: min 8 chars, uppercase, lowercase, number
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
    .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
    .refine((val) => /[0-9]/.test(val), 'Password must contain at least one number'),

  // Validate license number
  licenseNumber: z
    .string()
    .trim()
    .min(1, 'License number is required')
    .max(50, 'License number must not exceed 50 characters')
    .refine((val) => licenseNumberRegex.test(val), 'License number contains invalid characters'),

  // Validate TIN (alias)
  tinNumber: z
    .string()
    .trim()
    .max(9, 'TIN must be exactly 9 digits')
    .refine((val) => tinRegex.test(val), 'TIN must be exactly 9 digits'),

  // Optional string with max length
  optionalText: (maxLength: number = 50) =>
    z
      .string()
      .trim()
      .max(maxLength, `Must not exceed ${maxLength} characters`)
      .optional()
      .or(z.literal('')),

  // Required string with max length
  requiredText: (maxLength: number = 50) =>
    z
      .string()
      .trim()
      .min(1, 'This field is required')
      .max(maxLength, `Must not exceed ${maxLength} characters`),

  // Validate vehicle type
  vehicleType: z.enum(['Motorcycle', 'Bicycle', 'Tricycle', 'Car/Van', 'Truck'], {
    errorMap: () => ({ message: 'Invalid vehicle type' }),
  }),
};

// Common error messages
export const errorMessages = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_PENDING: 'Your account is pending approval by the administrator.',
  ACCOUNT_REJECTED: 'Your account has been rejected. Please contact support.',
  DUPLICATE_EMAIL: 'Email is already registered.',
  INVALID_FORMAT: 'Invalid format. Please check your input.',
  REQUIRED_FIELD: 'This field is required.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  FILE_REQUIRED: 'License photo is required.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 5 MB.',
  FILE_INVALID_TYPE: 'Invalid file type. Only JPG and PNG are allowed.',
};
