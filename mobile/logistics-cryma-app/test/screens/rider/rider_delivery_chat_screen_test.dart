import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:logistics_cryma_app/providers/auth_provider.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/rider_chat_service.dart';
import 'package:logistics_cryma_app/screens/rider/rider_delivery_chat_screen.dart';
import 'package:provider/provider.dart';

class _TestAuthProvider extends AuthProvider {
  @override
  int? get userId => 7;
}

class _FakeRiderChatService extends RiderChatService {
  _FakeRiderChatService() : super(apiClient: ApiClient());

  bool failFirstListRequest = true;
  final sendCompleter = Completer<void>();
  final sent = <({String message, String clientMessageId})>[];
  final _chats = const [
    RiderDeliveryChat(
      id: 43,
      orderId: 19,
      buyerName: 'Logistics',
      type: 'seller_logistics',
    ),
    RiderDeliveryChat(
      id: 42,
      orderId: 19,
      buyerName: 'Ana Buyer',
      type: 'buyer_rider',
    ),
  ];
  final _messages = <RiderChatMessage>[
    RiderChatMessage(
      id: 1,
      senderId: 8,
      senderName: 'Ana Buyer',
      text: 'I am waiting at the gate.',
      createdAt: DateTime.utc(2026, 2, 2, 3, 3),
    ),
  ];

  @override
  Future<List<RiderDeliveryChat>> getDeliveryChats() async {
    if (failFirstListRequest) {
      failFirstListRequest = false;
      throw const ApiException('Temporary connection error');
    }
    return _chats;
  }

  @override
  Future<List<RiderChatMessage>> getMessages(int conversationId) async {
    expect(conversationId, 42);
    return List.of(_messages);
  }

  @override
  Future<void> sendMessage({
    required int conversationId,
    required String message,
    required String clientMessageId,
  }) async {
    expect(conversationId, 42);
    sent.add((message: message, clientMessageId: clientMessageId));
    await sendCompleter.future;
    _messages.add(
      RiderChatMessage(
        id: 2,
        senderId: 7,
        senderName: 'Rider',
        text: message,
        createdAt: DateTime.utc(2026, 2, 2, 3, 4),
      ),
    );
  }
}

void main() {
  testWidgets('retries chat loading, shows server messages, and sends safely',
      (tester) async {
    final service = _FakeRiderChatService();
    await tester.pumpWidget(
      ChangeNotifierProvider<AuthProvider>.value(
        value: _TestAuthProvider(),
        child: MaterialApp(
          home: RiderDeliveryChatScreen(
            orderId: 19,
            chatService: service,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Temporary connection error'), findsOneWidget);

    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('Chat with Ana Buyer'), findsOneWidget);
    expect(find.text('I am waiting at the gate.'), findsOneWidget);
    expect(find.textContaining('Feb 2'), findsOneWidget);
    expect(find.text('Logistics'), findsNothing);

    await tester.enterText(find.byType(TextField), 'I am here');
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();
    expect(service.sent, hasLength(1));
    expect(service.sent.single.message, 'I am here');
    expect(
      service.sent.single.clientMessageId,
      matches(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    service.sendCompleter.complete();
    await tester.pumpAndSettle();
    expect(find.text('I am here'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
}
