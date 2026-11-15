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

  String get normalizedLabel => label.trim().toLowerCase();

  IconData get icon => switch (normalizedLabel) {
        'home' => Icons.home_outlined,
        'work' => Icons.work_outline,
        _ => Icons.location_on_outlined,
      };

  String get displayLabel => switch (normalizedLabel) {
        'home' => 'Home',
        'work' => 'Work',
        _ => 'Other',
      };

  factory BuyerAddress.fromJson(Map<String, dynamic> json) {
    final id = int.tryParse(json['id']?.toString() ?? '');
    if (id == null) throw const FormatException('Invalid address ID.');
    String value(String key) => json[key]?.toString() ?? '';

    final rawDefault = json['is_default'];
    final parsedDefault = switch (rawDefault) {
      null => false,
      bool value => value,
      num value => value != 0,
      String value => const ['true', '1', 'yes'].contains(
            value.trim().toLowerCase(),
          ),
      _ => false,
    };

    return BuyerAddress(
      id: id,
      label: value('label').trim().toLowerCase(),
      recipientName: value('recipient_name').trim(),
      phone: value('phone').trim(),
      region: value('region').trim(),
      province: value('province').trim(),
      municipality: value('municipality').trim(),
      barangay: value('barangay').trim(),
      houseNumber: value('house_number').trim(),
      buildingName: value('building_name').trim(),
      unitNumber: value('unit_number').trim(),
      street: value('street').trim(),
      postalCode: value('postal_code').trim(),
      isDefault: parsedDefault,
    );
  }

  Map<String, dynamic> toPayload({required bool makeDefault}) => {
        'label': normalizedLabel,
        'recipient_name': recipientName.trim(),
        'phone': phone.trim(),
        'region': region.trim(),
        'province': province.trim(),
        'municipality': municipality.trim(),
        'barangay': barangay.trim(),
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
