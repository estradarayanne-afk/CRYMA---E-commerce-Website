import 'dart:async';

import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:cryma_flutter_app/widgets/network_loading_indicator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('tracks concurrent network requests and releases them on failure',
      () async {
    final firstRequest = Completer<void>();
    final secondRequest = Completer<void>();
    final first = ApiService.trackRequest(() => firstRequest.future);
    final second = ApiService.trackRequest(() => secondRequest.future);

    expect(ApiService.activeRequests.value, 2);
    firstRequest.completeError(Exception('request failed'));
    await expectLater(first, throwsException);
    expect(ApiService.activeRequests.value, 1);

    secondRequest.complete();
    await second;
    expect(ApiService.activeRequests.value, 0);
  });

  testWidgets('shows an accessible branded loading indicator while active',
      (tester) async {
    ApiService.activeRequests.value = 0;
    addTearDown(() => ApiService.activeRequests.value = 0);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ValueListenableBuilder<int>(
            valueListenable: ApiService.activeRequests,
            builder: (context, activeRequests, _) =>
                NetworkLoadingIndicator(isLoading: activeRequests > 0),
          ),
        ),
      ),
    );
    expect(find.text('Loading CRYMA'), findsNothing);

    ApiService.activeRequests.value = 1;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.bySemanticsLabel('Loading CRYMA'), findsOneWidget);
    expect(find.text('Loading CRYMA'), findsOneWidget);

    ApiService.activeRequests.value = 0;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Loading CRYMA'), findsNothing);
  });
}
