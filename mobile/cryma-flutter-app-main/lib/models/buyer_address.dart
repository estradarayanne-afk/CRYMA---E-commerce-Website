import 'package:flutter/material.dart';

class BuyerAddress {
  const BuyerAddress({
    required this.id,
    required this.label,
    required this.recipientName,
    required this.phone,
    required this.region,
    required this.province,
    required this.municipality,
    required this.barangay,
    this.houseNumber = '',
    this.buildingName = '',
    this.unitNumber = '',
    this.street = '',
    this.postalCode = '',
    this.isDefault = false,
  });

  final int id;
  final String label;
  final String recipientName;
  final String phone;
  final String region;
  final String province;
  final String municipality;
  final String barangay;
  final String houseNumber;
  final String buildingName;
  final String unitNumber;
  final String street;
  final String postalCode;
  final bool isDefault;

  IconData get icon => switch (label) {
        'home' => Icons.home_outlined,
        'work' => Icons.work_outline,
        _ => Icons.location_on_outlined,
      };

  String get displayLabel => switch (label) {
        'home' => 'Home',
        'work' => 'Work',
        _ => 'Other',
      };

  factory BuyerAddress.fromJson(Map<String, dynamic> json) {
    final id = int.tryParse(json['id']?.toString() ?? '');
    if (id == null) throw const FormatException('Invalid address ID.');
    String value(String key) => json[key]?.toString() ?? '';
    return BuyerAddress(
      id: id,
      label: value('label'),
      recipientName: value('recipient_name'),
      phone: value('phone'),
      region: value('region'),
      province: value('province'),
      municipality: value('municipality'),
      barangay: value('barangay'),
      houseNumber: value('house_number'),
      buildingName: value('building_name'),
      unitNumber: value('unit_number'),
      street: value('street'),
      postalCode: value('postal_code'),
      isDefault: json['is_default'] == true || json['is_default'] == 1,
    );
  }

  Map<String, dynamic> toPayload({required bool makeDefault}) => {
        'label': label,
        'recipient_name': recipientName.trim(),
        'phone': phone.trim(),
        'region': region,
        'province': province,
        'municipality': municipality,
        'barangay': barangay,
        'house_number': houseNumber.trim(),
        'building_name': buildingName.trim(),
        'unit_number': unitNumber.trim(),
        'street': street.trim(),
        'postal_code': postalCode.trim(),
        'is_default': makeDefault,
      };

  String get formattedAddress => [
        houseNumber,
        buildingName,
        unitNumber,
        street,
        barangay,
        municipality,
        province,
        region,
        postalCode,
      ].where((part) => part.trim().isNotEmpty).join(', ');
}
