import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { passwordHash } from '../utils/passwordHash';
import { userRepository } from '../repositories/user.repository';
import { User } from '../types/models';
import { createError } from '../types/errors';

export interface LoginResult {
  user: User;
  token: string;
  expiresIn: string;
}

export interface RegisterRiderResult {
  user: User;
  token: string;
  expiresIn: string;
  riderId: string;
}

export class AuthService {
  /**
   * Login a user (rider or admin)
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      throw createError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    // Check if account is pending
    if (user.accountStatus === 'pending') {
      throw createError(
        'ACCOUNT_PENDING',
        'Your account is pending approval by the administrator. Please be patient.',
        403
      );
    }

    // Check if account is rejected
    if (user.accountStatus === 'rejected') {
      throw createError(
        'ACCOUNT_REJECTED',
        'Your account has been rejected. Please contact support.',
        403
      );
    }

    // Verify password
    const isPasswordValid = await passwordHash.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user,
      token,
      expiresIn: env.JWT_EXPIRY,
    };
  }

  /**
   * Register a new rider
   */
  async registerRider(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    tin: string;
    vehicleType: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    plateNumber?: string;
    licenseNumber: string;
    licenseExpiry?: string;
    licenseClassification?: string;
    licenseRestrictions?: string;
    licensePhotoPath?: string;
    regionCode: string;
    regionName: string;
    provinceCode: string;
    provinceName: string;
    municipalityCode: string;
    municipalityName: string;
    barangayCode: string;
    barangayName: string;
    houseNumber?: string;
    street?: string;
    additionalAddress?: string;
    termsVersion: string;
    termsAcceptedAt: string;
    privacyVersion: string;
    privacyAcceptedAt: string;
  }): Promise<RegisterRiderResult> {
    // Check if email already exists
    const existingUser = await userRepository.getUserByEmail(data.email);
    if (existingUser) {
      throw createError('DUPLICATE_EMAIL', 'Email is already registered.', 409);
    }

    // Hash password
    const hashedPassword = await passwordHash.hash(data.password);

    // Generate rider ID
    const riderId = await this.generateRiderId();

    // Create user
    const now = new Date().toISOString();
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;

    const user = await userRepository.create(
      data.email.toLowerCase().trim(),
      hashedPassword,
      fullName,
      'rider',
      'pending',
      {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone,
        tin: data.tin,
        vehicleType: data.vehicleType,
        vehicleMake: data.vehicleMake?.trim(),
        vehicleModel: data.vehicleModel?.trim(),
        vehicleColor: data.vehicleColor?.trim(),
        plateNumber: data.plateNumber?.trim().toUpperCase(),
        licenseNumber: data.licenseNumber.trim(),
        licenseExpiry: data.licenseExpiry,
        licenseClassification: data.licenseClassification,
        licenseRestrictions: data.licenseRestrictions?.trim(),
        licensePhotoPath: data.licensePhotoPath,
        riderId,
        regionCode: data.regionCode,
        regionName: data.regionName,
        provinceCode: data.provinceCode,
        provinceName: data.provinceName,
        municipalityCode: data.municipalityCode,
        municipalityName: data.municipalityName,
        barangayCode: data.barangayCode,
        barangayName: data.barangayName,
        houseNumber: data.houseNumber?.trim(),
        street: data.street?.trim(),
        additionalAddress: data.additionalAddress?.trim(),
        termsVersion: data.termsVersion,
        termsAcceptedAt: data.termsAcceptedAt,
        privacyVersion: data.privacyVersion,
        privacyAcceptedAt: data.privacyAcceptedAt,
      }
    );

    // Generate token
    const token = this.generateToken(user);

    return {
      user,
      token,
      expiresIn: env.JWT_EXPIRY,
      riderId,
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRY,
      }
    );
  }

  /**
   * Generate unique rider ID
   */
  private async generateRiderId(): Promise<string> {
    const riderCount = await userRepository.countRiders();
    const nextId = riderCount + 1;
    return `RID-${nextId.toString().padStart(4, '0')}`;
  }
}

export const authService = new AuthService();
