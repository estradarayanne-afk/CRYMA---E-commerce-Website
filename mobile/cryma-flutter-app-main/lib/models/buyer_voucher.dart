class BuyerVoucher {
  const BuyerVoucher({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    required this.buyerStatus,
    required this.isClaimed,
    this.description,
    this.minimumSpend,
    this.maximumDiscount,
    this.startsAt,
    this.expiresAt,
    this.statusReason,
    this.sellerName,
    this.categories = const [],
    this.eligibleProductNames = const [],
  });

  final int id;
  final String code;
  final String discountType;
  final String discountValue;
  final String buyerStatus;
  final bool isClaimed;
  final String? description;
  final String? minimumSpend;
  final String? maximumDiscount;
  final DateTime? startsAt;
  final DateTime? expiresAt;
  final String? statusReason;
  final String? sellerName;
  final List<String> categories;
  final List<String> eligibleProductNames;

  factory BuyerVoucher.fromJson(Map<String, dynamic> json) {
    final id = int.tryParse(json['id']?.toString() ?? '');
    if (id == null || json['code'] == null) {
      throw const FormatException('Invalid voucher record.');
    }
    List<String> strings(dynamic value) => value is List
        ? value.map((item) => item.toString()).toList(growable: false)
        : const [];
    return BuyerVoucher(
      id: id,
      code: json['code'].toString(),
      discountType: json['discount_type']?.toString() ?? '',
      discountValue: json['discount_value']?.toString() ?? '',
      buyerStatus: json['buyer_status']?.toString() ?? 'ineligible',
      isClaimed: json['is_claimed'] == true,
      description: json['description']?.toString(),
      minimumSpend: json['minimum_spend']?.toString(),
      maximumDiscount: json['maximum_discount']?.toString(),
      startsAt: DateTime.tryParse(json['starts_at']?.toString() ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at']?.toString() ?? ''),
      statusReason: json['buyer_status_reason']?.toString(),
      sellerName: json['seller_name']?.toString(),
      categories: strings(json['categories']),
      eligibleProductNames: strings(json['eligible_product_names']),
    );
  }

  BuyerVoucher copyWith({bool? isClaimed}) => BuyerVoucher(
        id: id,
        code: code,
        discountType: discountType,
        discountValue: discountValue,
        buyerStatus: buyerStatus,
        isClaimed: isClaimed ?? this.isClaimed,
        description: description,
        minimumSpend: minimumSpend,
        maximumDiscount: maximumDiscount,
        startsAt: startsAt,
        expiresAt: expiresAt,
        statusReason: statusReason,
        sellerName: sellerName,
        categories: categories,
        eligibleProductNames: eligibleProductNames,
      );

  String get discountLabel {
    final value = double.tryParse(discountValue);
    if (value == null) return 'Voucher discount';
    final amount = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(2);
    return discountType == 'percentage' ? '$amount% off' : '₱$amount off';
  }
}

class BuyerVoucherValidation {
  const BuyerVoucherValidation({
    required this.code,
    required this.discountAmount,
    required this.subtotal,
    required this.eligibleSubtotal,
  });

  final String code;
  final String discountAmount;
  final String subtotal;
  final String eligibleSubtotal;

  factory BuyerVoucherValidation.fromJson(Map<String, dynamic> json) {
    final voucher = json['voucher'];
    if (voucher is! Map<String, dynamic> ||
        voucher['code'] == null ||
        json['discount_amount'] == null) {
      throw const FormatException('Invalid voucher validation response.');
    }
    return BuyerVoucherValidation(
      code: voucher['code'].toString(),
      discountAmount: json['discount_amount'].toString(),
      subtotal: json['subtotal']?.toString() ?? '',
      eligibleSubtotal: json['eligible_subtotal']?.toString() ?? '',
    );
  }
}
