import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:logistics_cryma_app/models/courier_parcel.dart';
import 'package:logistics_cryma_app/screens/rider/rider_parcel_detail_screen.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/courier_service.dart';

class _FakeCourierService extends CourierService {
  _FakeCourierService() : super(apiClient: ApiClient());

  CourierParcel parcel = CourierParcel.fromDeliveryJson({
    'id': 8,
    'order_id': 35,
    'status': 'OUT_FOR_DELIVERY',
    'order': {'items': []},
  });
  String? submittedReason;
  DeliveryFailureResolution? submittedResolution;

  @override
  Future<CourierParcel> getParcel(CourierTaskType type, int id) async => parcel;

  @override
  Future<void> failDelivery(
    int id,
    String reason, {
    DeliveryFailureResolution resolution =
        DeliveryFailureResolution.redeliverTomorrow,
  }) async {
    submittedReason = reason;
    submittedResolution = resolution;
    parcel = CourierParcel.fromDeliveryJson({
      'id': id,
      'order_id': 35,
      'status': resolution == DeliveryFailureResolution.returnToSender
          ? 'RETURNED'
          : 'DELIVERY_FAILED',
      'failure_reason': reason,
      'order': {'items': []},
    });
  }
}

void main() {
  testWidgets('requires a reason and submits return-to-sender distinctly',
      (tester) async {
    final service = _FakeCourierService();
    await tester.pumpWidget(
      MaterialApp(
        home: RiderParcelDetailScreen(
          type: CourierTaskType.delivery,
          id: 8,
          courierService: service,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Report failed delivery'));
    await tester.pumpAndSettle();

    expect(
      tester
          .widget<ChoiceChip>(
            find.widgetWithText(ChoiceChip, 'Redeliver tomorrow'),
          )
          .selected,
      isTrue,
    );
    await tester.tap(find.text('Submit outcome'));
    await tester.pumpAndSettle();
    expect(
      find.text('Enter a reason for the failed delivery.'),
      findsOneWidget,
    );

    await tester.enterText(
      find.byType(TextFormField),
      'Recipient declined the parcel',
    );
    await tester.tap(find.widgetWithText(ChoiceChip, 'Return to sender'));
    await tester.tap(find.text('Submit outcome'));
    await tester.pumpAndSettle();

    expect(service.submittedReason, 'Recipient declined the parcel');
    expect(
      service.submittedResolution,
      DeliveryFailureResolution.returnToSender,
    );
    expect(find.text('Returned'), findsOneWidget);
    expect(
      find.text('Return to sender requested. Current status: Returned.'),
      findsOneWidget,
    );
  });
}
