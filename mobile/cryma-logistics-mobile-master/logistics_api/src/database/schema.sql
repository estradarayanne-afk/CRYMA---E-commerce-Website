-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('rider', 'admin')),
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  tin TEXT,
  vehicle_type TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  plate_number TEXT,
  license_number TEXT,
  license_expiry TEXT,
  license_classification TEXT,
  license_restrictions TEXT,
  rider_id TEXT UNIQUE,
  license_photo_path TEXT,
  license_photo_pending TEXT,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK(account_status IN ('pending', 'active', 'rejected')),
  region_code TEXT,
  region_name TEXT,
  province_code TEXT,
  province_name TEXT,
  municipality_code TEXT,
  municipality_name TEXT,
  barangay_code TEXT,
  barangay_name TEXT,
  house_number TEXT,
  street TEXT,
  additional_address TEXT,
  terms_version TEXT,
  terms_accepted_at TEXT,
  privacy_version TEXT,
  privacy_accepted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  sender TEXT,
  recipient TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FOR_PICKUP' CHECK(status IN ('FOR_PICKUP', 'ON_TRANSIT', 'AT_SORTING_CENTER', 'OUT_FOR_DELIVERY', 'DELIVERED')),
  assigned_rider_id INTEGER,
  is_dummy INTEGER NOT NULL DEFAULT 0,
  qr_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_rider_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_rider ON orders(assigned_rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rider_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved')),
  order_id TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_rider_id ON reports(rider_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rider_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_rider_id ON conversations(rider_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'normal' CHECK(message_type IN ('normal', 'warning_notice')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Registration Approvals table
CREATE TABLE IF NOT EXISTS registration_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  approved_by INTEGER,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('approved', 'rejected', 'pending')),
  rejection_reason TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_registration_approvals_user_id ON registration_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_registration_approvals_status ON registration_approvals(approval_status);

-- License Update Requests table
CREATE TABLE IF NOT EXISTS license_update_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  old_photo_path TEXT,
  new_photo_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER,
  rejection_reason TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_license_updates_user_id ON license_update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_license_updates_status ON license_update_requests(status);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_id INTEGER,
  target_type TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
