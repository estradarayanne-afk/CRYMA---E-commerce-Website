import 'package:cryma_flutter_app/screens/onboarding/splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('startup splash presents the animated delivery scene',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: const SplashScreen(),
        routes: {
          '/welcome': (_) => const Scaffold(body: Text('Welcome')),
          '/home': (_) => const Scaffold(body: Text('Home')),
        },
      ),
    );
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.byKey(const Key('startup-delivery-scene')), findsOneWidget);
    expect(find.text('CRYMA'), findsOneWidget);
    expect(find.text('Your Shopping, Your Way'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    expect(find.text('Welcome'), findsOneWidget);
  });
}
