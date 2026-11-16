import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/rider_chat_service.dart';

class _MemoryTokenStore implements TokenStore {
  @override
  Future<String?> read() async => 'test-token';

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> delete() async {}
}

void main() {
  test('reads rider chats and authoritative conversation messages', () async {
    final client = MockClient((request) async {
      expect(request.headers['authorization'], 'Bearer test-token');
      if (request.url.path == '/api/courier/delivery-chats') {
        expect(request.method, 'GET');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': 42,
                'type': 'buyer_rider',
                'order_id': 19,
                'buyer': {'first_name': 'Ana', 'last_name': 'Buyer'},
              },
            ],
          }),
          200,
        );
      }
      expect(request.url.path, '/api/courier/delivery-chats/42');
      expect(request.method, 'GET');
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'id': 42,
            'messages': [
              {
                'id': 2,
                'sender_id': 7,
                'message': 'Second',
                'created_at': '2026-02-02T03:04:00Z',
                'sender': {'first_name': 'Rider', 'last_name': 'One'},
              },
              {
                'id': 1,
                'sender_id': 8,
                'message': 'First',
                'created_at': '2026-02-02T03:03:00Z',
                'sender': {'first_name': 'Ana', 'last_name': 'Buyer'},
              },
            ],
          },
        }),
        200,
      );
    });
    final service = RiderChatService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    final chats = await service.getDeliveryChats();
    expect(chats.single.id, 42);
    expect(chats.single.orderId, 19);
    expect(chats.single.buyerName, 'Ana Buyer');

    final messages = await service.getMessages(chats.single.id);
    expect(messages.map((message) => message.text), ['First', 'Second']);
    expect(messages.first.senderName, 'Ana Buyer');
    expect(messages.first.createdAt.toUtc(), DateTime.utc(2026, 2, 2, 3, 3));
  });

  test('posts with the backend message and idempotency fields', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/courier/delivery-chats/42/messages');
      expect(jsonDecode(request.body), {
        'message': 'On my way',
        'client_message_id': 'f8a9e0ca-79cb-46e7-9c75-5ddc153c2920',
      });
      return http.Response('{}', 201);
    });
    final service = RiderChatService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test',
      ),
    );

    await service.sendMessage(
      conversationId: 42,
      message: 'On my way',
      clientMessageId: 'f8a9e0ca-79cb-46e7-9c75-5ddc153c2920',
    );
  });
}
