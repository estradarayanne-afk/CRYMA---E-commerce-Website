# Phase 2 API — Rider Registration & Authentication

**Status**: ✅ Complete  
**Endpoints**: 11 (Auth, Address, Admin)  
**Test Coverage**: 40+ test cases

---

## Overview

Phase 2 implements complete rider registration and authentication with:
- ✅ Comprehensive input validation (50-char limits, name validation, phone normalization)
- ✅ Secure password hashing (bcrypt, 12 rounds)
- ✅ Email uniqueness enforcement
- ✅ Philippine geography data (regions, provinces, municipalities, barangays)
- ✅ License photo uploads (private storage)
- ✅ Account states (pending, active, rejected)
- ✅ Admin approval workflow
- ✅ Role-based authorization
- ✅ Full test coverage

---

## Authentication Endpoints

### POST /api/auth/login
Login with email and password.

**Request**:
```json
{
  "email": "rider@example.com",
  "password": "SecurePass123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": { ...user object... },
    "token": "eyJhbGc...",
    "expiresIn": "24h"
  }
}
```

**Error Responses**:
- `401 INVALID_CREDENTIALS` — Email or password incorrect
- `403 ACCOUNT_PENDING` — Account pending admin approval
- `403 ACCOUNT_REJECTED` — Account has been rejected

---

### POST /api/auth/register
Register as a new rider with license photo upload.

**Request** (multipart/form-data):
- `licensePhoto` — JPG/PNG file (required, max 5 MB)
- JSON body with fields below

**Body**:
```json
{
  "firstName": "Juan",              // Max 50 chars, Unicode letters only
  "lastName": "Dela Cruz",          // Max 50 chars, Unicode letters only
  "email": "juan@example.com",      // Valid format, unique
  "password": "SecurePass123",      // Min 8 chars, uppercase+lowercase+number
  "confirmPassword": "SecurePass123",
  "phone": "09123456789",           // Philippine format (09XXXXXXXXX or +639XXXXXXXXX)
  "tin": "123456789",               // Exactly 9 digits
  
  // Vehicle Information
  "vehicleType": "Motorcycle",      // Motorcycle, Bicycle, Tricycle, Car/Van, Truck
  "vehicleMake": "Honda",           // Optional, max 50 chars
  "vehicleModel": "CB150",          // Optional, max 50 chars
  "vehicleColor": "Red",            // Optional, max 50 chars
  "plateNumber": "NCR-1234",        // Optional, max 50 chars
  
  // License Information
  "licenseNumber": "N01-23-456789", // Required, max 50 chars
  "licenseExpiry": "2025-12-31",    // Optional, ISO 8601 date
  "licenseClassification": "A1",    // Optional
  "licenseRestrictions": "None",    // Optional, max 50 chars
  
  // Address Information
  "regionCode": "NCR",
  "regionName": "National Capital Region",
  "provinceCode": "MET",
  "provinceName": "Metro Manila",
  "municipalityCode": "MAN",
  "municipalityName": "Manila",
  "barangayCode": "BAY",
  "barangayName": "Baywalk",
  "houseNumber": "123",             // Optional, max 50 chars
  "street": "Main Street",          // Optional, max 50 chars
  "additionalAddress": "Near market", // Optional, max 50 chars
  
  // Legal Agreements
  "termsVersion": "1.0",
  "termsAcceptedAt": "2024-01-01T00:00:00Z",
  "privacyVersion": "1.0",
  "privacyAcceptedAt": "2024-01-01T00:00:00Z"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": { ...user object with pending status... },
    "token": "eyJhbGc...",
    "expiresIn": "24h",
    "riderId": "RID-0001"
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR` — Invalid input data
- `400 FILE_TOO_LARGE` — License photo exceeds 5 MB
- `400 INVALID_FILE_TYPE` — License photo must be JPG or PNG
- `409 DUPLICATE_EMAIL` — Email already registered

---

### GET /api/auth/profile
Get current authenticated user profile.

**Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": { ...full user object... }
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED` — Missing or invalid token
- `404 NOT_FOUND` — User not found

---

### GET /api/auth/account-status
Check registration account status.

**Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "pending",   // pending, active, rejected
    "email": "rider@example.com",
    "riderId": "RID-0001",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Philippine Geography Endpoints

### GET /api/address/regions
Get all Philippine regions (cached).

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "regions": [
      { "code": "NCR", "name": "National Capital Region" },
      { "code": "COR", "name": "Cordillera Administrative Region" }
      // ... more regions
    ]
  }
}
```

---

### GET /api/address/provinces/:regionCode
Get provinces for a region.

**Example**: `/api/address/provinces/NCR`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "provinces": [
      { "code": "MET", "name": "Metro Manila" },
      { "code": "LAG", "name": "Laguna" }
      // ... more provinces
    ]
  }
}
```

---

### GET /api/address/municipalities/:provinceCode
Get municipalities/cities for a province.

**Example**: `/api/address/municipalities/MET`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "municipalities": [
      { "code": "MAN", "name": "Manila" },
      { "code": "QZN", "name": "Quezon City" }
      // ... more municipalities
    ]
  }
}
```

---

### GET /api/address/barangays/:municipalityCode
Get barangays for a municipality.

**Example**: `/api/address/barangays/MAN`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "barangays": [
      { "code": "BAY", "name": "Baywalk" },
      { "code": "BIN", "name": "Binondo" }
      // ... more barangays
    ]
  }
}
```

---

## Admin Endpoints

**All admin endpoints require**: 
- Authentication: `Authorization: Bearer <token>`
- Admin role (role must be 'admin')

---

### GET /api/admin/riders/pending
Get all pending rider registrations.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "riders": [ ...pending riders... ],
    "count": 5
  }
}
```

---

### GET /api/admin/riders/:riderId
Get specific rider details.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "rider": { ...full rider object... }
  }
}
```

**Error Responses**:
- `404 NOT_FOUND` — Rider not found
- `403 FORBIDDEN` — Not a rider account

---

### POST /api/admin/riders/:riderId/approve
Approve a pending rider registration.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "rider": { ...updated rider with active status... }
  }
}
```

**Error Responses**:
- `404 NOT_FOUND` — Rider not found
- `409 CONFLICT` — Rider status is not pending

---

### POST /api/admin/riders/:riderId/reject
Reject a pending rider registration.

**Request**:
```json
{
  "reason": "License photo is unclear"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Rider registration rejected",
    "riderId": 123
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR` — Reason is required
- `404 NOT_FOUND` — Rider not found
- `409 CONFLICT` — Rider status is not pending

---

### GET /api/admin/stats
Get admin dashboard statistics.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "pendingRiders": 5,
      "activeRiders": 42,
      "totalRiders": 47
    }
  }
}
```

---

## Validation Rules

### Names
- **Max**: 50 characters
- **Format**: Unicode letters, spaces, hyphens, apostrophes only
- **Rejects**: Numbers, special characters
- **Examples**: ✅ José García, O'Connor, Jean-Pierre

### Email
- **Max**: 100 characters
- **Format**: Valid RFC email format
- **Unique**: Enforced in database
- **Normalization**: Lowercase

### Phone
- **Format**: Philippine (09XXXXXXXXX or +639XXXXXXXXX)
- **Normalization**: Converted to +639XXXXXXXXX
- **Validation**: 10 digits after 09 or 639

### Password
- **Min**: 8 characters
- **Max**: 128 characters
- **Requirements**: Uppercase, lowercase, number
- **Hashing**: bcrypt (12 rounds), never plaintext

### TIN
- **Format**: Exactly 9 digits
- **No Letters**: Digits only

### Vehicle Type
- **Enum**: Motorcycle, Bicycle, Tricycle, Car/Van, Truck

### License Number
- **Max**: 50 characters
- **Format**: Alphanumeric + dashes

### License Photo
- **Types**: JPG, PNG only
- **Max Size**: 5 MB
- **Storage**: Private (only accessible via authenticated API)

### All Text Fields
- **Max**: 50 characters (enforced on all optional text fields)

---

## Account States

### Pending
- New rider after registration
- Cannot access delivery operations
- Can log in to check status
- Awaiting admin approval

### Active
- Rider approved by admin
- Full access to rider features
- Can accept deliveries

### Rejected
- Registration rejected by admin
- Cannot log in
- Receives rejection reason via notification

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "path": "/api/endpoint"
  }
}
```

---

## File Upload

### License Photo Upload

**Endpoint**: `POST /api/auth/register`

**Field**: `licensePhoto` (multipart/form-data)

**Validation**:
- MIME types: `image/jpeg`, `image/png`
- Max size: 5 MB (5,242,880 bytes)
- Stored privately on server
- File naming: UUID-based (e.g., `550e8400-e29b-41d4-a716-446655440000.jpg`)

**Access**: Private, only via authenticated API calls

---

## Authentication

### Token Format
JWT (JSON Web Token) with payload:
```json
{
  "userId": 123,
  "email": "rider@example.com",
  "role": "rider",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Token Expiry
- **Duration**: 24 hours (configurable in .env)
- **Expiry Action**: User must re-login

### Bearer Token Usage
```
Authorization: Bearer eyJhbGc...
```

---

## Testing

**40+ Test Cases**:
- ✅ Login validation (email format, password required)
- ✅ Registration validation (all fields)
- ✅ Password requirements (uppercase, lowercase, number)
- ✅ 50-character limits (all text fields)
- ✅ Name validation (Unicode, no numbers)
- ✅ Email validation (format, uniqueness)
- ✅ Phone validation (Philippine format, normalization)
- ✅ TIN validation (9 digits)
- ✅ Vehicle type validation (enum)
- ✅ License photo validation (file type, size)
- ✅ Account states (pending, active, rejected)
- ✅ Admin approval workflow
- ✅ Authorization (role-based access)

---

## Setup & Development

### Install Dependencies
```bash
npm install
```

This adds `axios` for PSGC API calls.

### Run Tests
```bash
npm test
```

Expected output:
```
PASS  src/__tests__/auth.test.ts
PASS  src/__tests__/50-char-limit.test.ts
PASS  src/__tests__/integration.auth.test.ts
PASS  src/__tests__/validators.test.ts
PASS  src/__tests__/utils.test.ts

Tests: 40+ passed
```

### Start Development Server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## Database Changes

Phase 2 reuses Phase 1 database. No schema changes required.

Tables used:
- `users` — Rider/admin accounts
- `registration_approvals` — Approval history
- `audit_logs` — Admin actions

---

## Summary

Phase 2 delivers a complete, validated, and tested authentication system:
- ✅ All validation rules enforced
- ✅ 50-character limits on all text
- ✅ Name validation with Unicode support
- ✅ Philippine phone normalization
- ✅ Email uniqueness
- ✅ Secure password hashing
- ✅ Role-based authorization
- ✅ Account state management
- ✅ Admin approval workflow
- ✅ 40+ automated tests
- ✅ Private file storage
- ✅ Geographic data endpoints
