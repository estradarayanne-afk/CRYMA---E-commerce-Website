import { z } from 'zod';
import { validators } from './common';

export const loginSchema = z.object({
  email: validators.email,
  password: z.string().min(1, 'Password is required'),
});

export const registerRiderSchema = z
  .object({
    firstName: validators.name,
    lastName: validators.name,
    email: validators.email,
    password: validators.password,
    confirmPassword: z.string(),
    phone: validators.phone,
    tin: validators.tin,
    vehicleType: validators.vehicleType,
    vehicleMake: validators.optionalText(50),
    vehicleModel: validators.optionalText(50),
    vehicleColor: validators.optionalText(50),
    plateNumber: validators.optionalText(50),
    licenseNumber: validators.licenseNumber,
    licenseExpiry: z.string().optional().or(z.literal('')),
    licenseClassification: z.string().optional().or(z.literal('')),
    licenseRestrictions: validators.optionalText(50),
    regionCode: z.string().min(1, 'Region is required'),
    regionName: z.string().min(1, 'Region name is required'),
    provinceCode: z.string().min(1, 'Province is required'),
    provinceName: z.string().min(1, 'Province name is required'),
    municipalityCode: z.string().min(1, 'Municipality is required'),
    municipalityName: z.string().min(1, 'Municipality name is required'),
    barangayCode: z.string().min(1, 'Barangay is required'),
    barangayName: z.string().min(1, 'Barangay name is required'),
    houseNumber: validators.optionalText(50),
    street: validators.optionalText(50),
    additionalAddress: validators.optionalText(50),
    termsVersion: z.string().min(1, 'Terms version is required'),
    termsAcceptedAt: z.string().datetime('Invalid timestamp'),
    privacyVersion: z.string().min(1, 'Privacy version is required'),
    privacyAcceptedAt: z.string().datetime('Invalid timestamp'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterRiderInput = z.infer<typeof registerRiderSchema>;
