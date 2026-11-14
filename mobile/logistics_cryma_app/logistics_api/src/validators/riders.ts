import { z } from 'zod';
import { validators } from './common';

export const updateProfileSchema = z.object({
  fullName: validators.name,
  phone: validators.phone,
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: validators.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateCredentialsSchema = z
  .object({
    email: validators.email,
    password: validators.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const submitLicenseUpdateSchema = z.object({
  // File upload handled by multer middleware
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateCredentialsInput = z.infer<typeof updateCredentialsSchema>;
