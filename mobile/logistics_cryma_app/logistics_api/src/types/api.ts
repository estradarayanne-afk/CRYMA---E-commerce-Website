// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'rider' | 'admin';
  iat?: number;
  exp?: number;
}

// Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRiderRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
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
}

export interface CreateOrderRequest {
  itemName: string;
  itemDescription?: string;
  sender?: string;
  recipient: string;
  pickupLocation: string;
  destination: string;
}

export interface UpdateOrderStatusRequest {
  status: 'FOR_PICKUP' | 'ON_TRANSIT' | 'AT_SORTING_CENTER' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
}
