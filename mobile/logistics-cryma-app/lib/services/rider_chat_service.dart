import 'package:flutter/foundation.dart';

import 'api_client.dart';

@immutable
class RiderDeliveryChat {
  const RiderDeliveryChat({
    required this.id,
    required this.orderId,
    required this.buyerName,
    required this.type,
  });

  final int id;
  final int? orderId;
  final String buyerName;
  final String type;

  factory RiderDeliveryChat.fromJson(Map<String, dynamic> json) {
    final id = _asInt(json['id']);
    if (id == null) {
      throw const FormatException('Invalid rider chat data.');
    }
    final buyer = _asMap(json['buyer']);
    final name = [
      buyer?['first_name'],
      buyer?['last_name'],
    ].whereType<String>().where((part) => part.trim().isNotEmpty).join(' ');
    return RiderDeliveryChat(
      id: id,
      orderId: _asInt(json['order_id']),
      buyerName: name.isEmpty ? 'Buyer' : name,
      type: json['type'] is String ? json['type'] as String : '',
    );
  }
}

@immutable
class RiderChatMessage {
  const RiderChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.createdAt,
  });

  final int id;
  final int? senderId;
  final String senderName;
  final String text;
  final DateTime createdAt;

  factory RiderChatMessage.fromJson(Map<String, dynamic> json) {
    final id = _asInt(json['id']);
    final createdAt = json['created_at'] is String
        ? DateTime.tryParse(json['created_at'] as String)
        : null;
    if (id == null || json['message'] is! String || createdAt == null) {
      throw const FormatException('Invalid rider chat message data.');
    }
    final sender = _asMap(json['sender']);
    final name = [
      sender?['first_name'],
      sender?['last_name'],
    ].whereType<String>().where((part) => part.trim().isNotEmpty).join(' ');
    return RiderChatMessage(
      id: id,
      senderId: _asInt(json['sender_id']),
      senderName: name.isEmpty ? 'CRYMA' : name,
      text: json['message'] as String,
      createdAt: createdAt,
    );
  }
}

class RiderChatService {
  RiderChatService({ApiClient? apiClient})
      : _api = apiClient ?? ApiClient.instance;

  static final instance = RiderChatService();

  final ApiClient _api;

  Future<List<RiderDeliveryChat>> getDeliveryChats() async {
    final response = await _api.get('courier/delivery-chats');
    final data = response['data'];
    if (data is! List) {
      throw const ApiException(
        'The CRYMA server returned an invalid chat list.',
      );
    }
    try {
      return data
          .map((item) => RiderDeliveryChat.fromJson(_requiredMap(item)))
          .toList();
    } on FormatException {
      throw const ApiException('The CRYMA server returned invalid chat data.');
    }
  }

  Future<List<RiderChatMessage>> getMessages(int conversationId) async {
    final response = await _api.get('courier/delivery-chats/$conversationId');
    final data = response['data'];
    if (data is! Map || data['messages'] is! List) {
      throw const ApiException(
        'The CRYMA server returned invalid chat messages.',
      );
    }
    try {
      return (data['messages'] as List)
          .map((item) => RiderChatMessage.fromJson(_requiredMap(item)))
          .toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    } on FormatException {
      throw const ApiException(
        'The CRYMA server returned invalid chat messages.',
      );
    }
  }

  Future<void> sendMessage({
    required int conversationId,
    required String message,
    required String clientMessageId,
  }) async {
    await _api.post(
      'courier/delivery-chats/$conversationId/messages',
      body: {'message': message, 'client_message_id': clientMessageId},
    );
  }
}

Map<String, dynamic> _requiredMap(dynamic value) {
  if (value is! Map) {
    throw const FormatException('Expected an object.');
  }
  return Map<String, dynamic>.from(value);
}

Map<String, dynamic>? _asMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

int? _asInt(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value');
