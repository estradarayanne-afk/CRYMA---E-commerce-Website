// ── User Roles ───────────────────────────────────────────────────────────────
enum UserRole { rider, superUser }

extension UserRoleX on UserRole {
  String get value => switch (this) {
        UserRole.rider => 'rider',
        UserRole.superUser => 'super_user',
      };

  static UserRole fromString(String s) => switch (s) {
        'super_user' => UserRole.superUser,
        _ => UserRole.rider,
      };
}

// ── Order Statuses ───────────────────────────────────────────────────────────
enum OrderStatus {
  forPickUp,
  assigned,
  pickedUp,
  onTransit,
  atSortingCenter,
  outForDelivery,
  delivered,
  failedDelivery,
  returnToSender,
}

extension OrderStatusX on OrderStatus {
  String get value => switch (this) {
        OrderStatus.forPickUp => 'FOR_PICKUP',
        OrderStatus.assigned => 'ASSIGNED',
        OrderStatus.pickedUp => 'PICKED_UP',
        OrderStatus.onTransit => 'ON_TRANSIT',
        OrderStatus.atSortingCenter => 'AT_SORTING_CENTER',
        OrderStatus.outForDelivery => 'OUT_FOR_DELIVERY',
        OrderStatus.delivered => 'DELIVERED',
        OrderStatus.failedDelivery => 'FAILED_DELIVERY',
        OrderStatus.returnToSender => 'RETURN_TO_SENDER',
      };

  String get label => switch (this) {
        OrderStatus.forPickUp => 'For Pick Up',
        OrderStatus.assigned => 'Assigned',
        OrderStatus.pickedUp => 'Picked Up',
        OrderStatus.onTransit => 'On Transit',
        OrderStatus.atSortingCenter => 'At Sorting Center',
        OrderStatus.outForDelivery => 'Out for Delivery',
        OrderStatus.delivered => 'Delivered',
        OrderStatus.failedDelivery => 'Failed Delivery',
        OrderStatus.returnToSender => 'Return to Sender',
      };

  static OrderStatus fromString(String s) => switch (s) {
        'ASSIGNED' => OrderStatus.assigned,
        'PICKED_UP' => OrderStatus.pickedUp,
        'ON_TRANSIT' => OrderStatus.onTransit,
        'AT_SORTING_CENTER' => OrderStatus.atSortingCenter,
        'OUT_FOR_DELIVERY' => OrderStatus.outForDelivery,
        'DELIVERED' => OrderStatus.delivered,
        'FAILED_DELIVERY' => OrderStatus.failedDelivery,
        'RETURN_TO_SENDER' => OrderStatus.returnToSender,
        _ => OrderStatus.forPickUp,
      };

  bool get isActiveDelivery => this == OrderStatus.assigned ||
      this == OrderStatus.pickedUp ||
      this == OrderStatus.onTransit ||
      this == OrderStatus.outForDelivery ||
      this == OrderStatus.failedDelivery;

  bool get isTerminal =>
      this == OrderStatus.delivered || this == OrderStatus.returnToSender;
}

// ── Report Statuses ──────────────────────────────────────────────────────────
enum ReportStatus { active, resolved }

extension ReportStatusX on ReportStatus {
  String get value => switch (this) {
        ReportStatus.active => 'active',
        ReportStatus.resolved => 'resolved',
      };

  static ReportStatus fromString(String s) =>
      s == 'resolved' ? ReportStatus.resolved : ReportStatus.active;
}

// ── Conversation Types ───────────────────────────────────────────────────────
enum ConversationType { logistics, seller, buyer, warning }

extension ConversationTypeX on ConversationType {
  String get value => switch (this) {
        ConversationType.logistics => 'logistics',
        ConversationType.seller => 'seller',
        ConversationType.buyer => 'buyer',
        ConversationType.warning => 'warning',
      };

  String get label => switch (this) {
        ConversationType.logistics => 'Logistics',
        ConversationType.seller => 'Seller',
        ConversationType.buyer => 'Buyer',
        ConversationType.warning => 'Warning Notice',
      };

  static ConversationType fromString(String s) => switch (s) {
        'seller' => ConversationType.seller,
        'buyer' => ConversationType.buyer,
        'warning' => ConversationType.warning,
        _ => ConversationType.logistics,
      };
}

// ── Message Types ────────────────────────────────────────────────────────────
enum MessageType { normal, warningNotice }

extension MessageTypeX on MessageType {
  String get value => switch (this) {
        MessageType.normal => 'normal',
        MessageType.warningNotice => 'warning_notice',
      };

  static MessageType fromString(String s) =>
      s == 'warning_notice' ? MessageType.warningNotice : MessageType.normal;
}

// ── Constants ────────────────────────────────────────────────────────────────
const kSuperUserEmail = '111000111@alphamains.4evr';
const kSuperUserPassword = '100102005';
const kSuperUserDisplayName = 'SMgr Ruffles';
const kDefaultWarningMessage =
    'Your account has received a warning. Please review your recent activity and correct the reported issue. Continued violations may result in further action on your account.';
