import 'package:flutter_test/flutter_test.dart';
import 'package:logistics_cryma_app/models/courier_parcel.dart';

void main() {
  test('maps an assigned pickup using the website parcel contract', () {
    final parcel = CourierParcel.fromPickupJson({
      'id': 12,
      'order_id': 34,
      'parcel_code': 'CRYMA-PCL-ABCDEFGHIJKLMNOPQRST',
      'status': 'ASSIGNED_TO_PICKUP_RIDER',
      'pickup_address': '12 Main St, Makati',
      'order': {
        'items': [
          {
            'product': {'name': 'Headphones'},
            'seller': {'first_name': 'Maria', 'last_name': 'Santos'},
          },
        ],
      },
    });

    expect(parcel.id, 12);
    expect(parcel.orderId, 34);
    expect(parcel.type, CourierTaskType.pickup);
    expect(parcel.itemSummary, 'Headphones');
    expect(parcel.counterparty, 'Maria Santos');
    expect(parcel.canAcceptPickup, isTrue);
    expect(parcel.routeType, 'pickups');
  });

  test('uses the exact delivery total for COD proof', () {
    final parcel = CourierParcel.fromDeliveryJson({
      'id': 8,
      'order_id': 35,
      'status': 'OUT_FOR_DELIVERY',
      'delivery_attempts': 1,
      'order': {
        'payment_method': 'cash_on_delivery',
        'total_amount': '349.50',
        'delivery_address': {
          'house_number': '9',
          'street': 'Rizal St',
          'municipality': 'Pasig',
        },
        'items': [],
      },
    });

    expect(parcel.type, CourierTaskType.delivery);
    expect(parcel.address, '9, Rizal St, Pasig');
    expect(parcel.isCod, isTrue);
    expect(parcel.codAmount, 349.50);
    expect(parcel.canCompleteDelivery, isTrue);
    expect(parcel.deliveryAttempts, 1);
  });
}
