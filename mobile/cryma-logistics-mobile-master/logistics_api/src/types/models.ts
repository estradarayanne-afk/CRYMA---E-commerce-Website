// User/Rider Models
export interface User {
  id: number;
  email: string;
  password: string;
  role: 'rider' | 'admin';
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tin?: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  plateNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseClassification?: string;
  licenseRestrictions?: string;
  riderId?: string;
  licensePhotoPath?: string;
  licensePhotoPending?: string;
  accountStatus: 'pending' | 'active' | 'rejected';
  regionCode?: string;
  regionName?: string;
  provinceCode?: string;
  provinceName?: string;
  municipalityCode?: string;
  municipalityName?: string;
  barangayCode?: string;
  barangayName?: string;
  houseNumber?: string;
  street?: string;
  additionalAddress?: string;
  termsVersion?: string;
  termsAcceptedAt?: string;
  privacyVersion?: string;
  privacyAcceptedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// Order Models
export interface Order {
  id: number;
  orderId: string;
  itemName: string;
  itemDescription?: string;
  sender?: string;
  recipient: string;
  pickupLocation: string;
  destination: string;
  status: 'FOR_PICKUP' | 'ON_TRANSIT' | 'AT_SORTING_CENTER' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  assignedRiderId?: number;
  isDummy: boolean;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Report Models
export interface Report {
  id: number;
  riderId: number;
  reason: string;
  description?: string;
  status: 'active' | 'resolved';
  orderId?: string;
  createdBy?: number;
  createdAt: string;
}

// Conversation & Message Models
export interface Conversation {
  id: number;
  riderId: number;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId?: number;
  senderName: string;
  body: string;
  messageType: 'normal' | 'warning_notice';
  createdAt: string;
}

// Registration Approval Models
export interface RegistrationApproval {
  id: number;
  userId: number;
  approvedBy?: number;
  approvalStatus: 'approved' | 'rejected' | 'pending';
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
}

// License Update Request Models
export interface LicenseUpdateRequest {
  id: number;
  userId: number;
  oldPhotoPath?: string;
  newPhotoPath: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

// Audit Log Models
export interface AuditLog {
  id: number;
  adminId: number;
  action: string;
  targetId?: number;
  targetType?: string;
  details?: string;
  createdAt: string;
}
