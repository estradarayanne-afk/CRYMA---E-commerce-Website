import '../models/courier_parcel.dart';
import 'api_client.dart';

class CourierService {
  CourierService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient.instance;

  static final instance = CourierService();

  final ApiClient _api;

  Future<List<CourierParcel>> getActiveParcels() async {
    final responses = await Future.wait([
      _api.get('courier/pickups'),
      _api.get('courier/deliveries'),
    ]);
    return [
      ..._readParcels(responses[0], CourierTaskType.pickup),
      ..._readParcels(responses[1], CourierTaskType.delivery),
    ]..sort(_newestFirst);
  }

  Future<List<CourierParcel>> getHistory() async {
    final responses = await Future.wait([
      _api.get('courier/pickup-history'),
      _api.get('courier/delivery-history'),
    ]);
    return [
      ..._readParcels(responses[0], CourierTaskType.pickup),
      ..._readParcels(responses[1], CourierTaskType.delivery),
    ]..sort(_newestFirst);
  }

  Future<CourierParcel> getParcel(CourierTaskType type, int id) async {
    final response = await _api.get('courier/${_routeType(type)}/$id');
    return _readParcel(response, type);
  }

  Future<void> acceptPickup(int id) async {
    await _api.patch(
      'courier/pickups/$id/status',
      body: {
        'status': 'ACCEPTED_BY_PICKUP_RIDER',
        'expected_status': 'ASSIGNED_TO_PICKUP_RIDER',
      },
    );
  }

  Future<void> collectPickup(int id, String parcelCode) async {
    await _api.patch(
      'courier/pickups/$id/status',
      body: {
        'status': 'PICKED_UP',
        'expected_status': 'ACCEPTED_BY_PICKUP_RIDER',
        'parcel_code': parcelCode,
      },
    );
  }

  Future<void> startDelivery(int id, String parcelCode) async {
    await _api.patch(
      'courier/deliveries/$id/status',
      body: {
        'status': 'OUT_FOR_DELIVERY',
        'expected_status': 'ASSIGNED_TO_RIDER',
        'parcel_code': parcelCode,
      },
    );
  }

  Future<void> failDelivery(int id, String reason) async {
    await _api.patch(
      'courier/deliveries/$id/status',
      body: {
        'status': 'DELIVERY_FAILED',
        'expected_status': 'OUT_FOR_DELIVERY',
        'reason': reason,
      },
    );
  }

  Future<void> completeDelivery({
    required int id,
    required String recipientName,
    required String photoPath,
    double? codAmountCollected,
  }) async {
    final fields = <String, String>{
      'expected_status': 'OUT_FOR_DELIVERY',
      'recipient_full_name': recipientName.trim(),
    };
    if (codAmountCollected != null) {
      fields['cod_amount_collected'] = codAmountCollected.toStringAsFixed(2);
    }
    await _api.postMultipart(
      'courier/deliveries/$id/proof',
      fields: fields,
      fileField: 'photo',
      filePath: photoPath,
    );
  }

  static List<CourierParcel> _readParcels(
    Map<String, dynamic> response,
    CourierTaskType type,
  ) {
    final data = response['data'];
    if (data is! List) {
      throw const ApiException('The CRYMA server returned an invalid parcel list.');
    }
    return data.map((item) => _readParcelItem(item, type)).toList();
  }

  static CourierParcel _readParcel(
    Map<String, dynamic> response,
    CourierTaskType type,
  ) {
    final data = response['data'];
    return _readParcelItem(data, type);
  }

  static CourierParcel _readParcelItem(dynamic item, CourierTaskType type) {
    if (item is! Map) {
      throw const ApiException('The CRYMA server returned invalid parcel data.');
    }
    final data = Map<String, dynamic>.from(item);
    try {
      return type == CourierTaskType.pickup
          ? CourierParcel.fromPickupJson(data)
          : CourierParcel.fromDeliveryJson(data);
    } on FormatException {
      throw const ApiException('The CRYMA server returned invalid parcel data.');
    }
  }

  static String _routeType(CourierTaskType type) =>
      type == CourierTaskType.pickup ? 'pickups' : 'deliveries';

  static int _newestFirst(CourierParcel a, CourierParcel b) =>
      (b.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0))
          .compareTo(a.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0));
}
