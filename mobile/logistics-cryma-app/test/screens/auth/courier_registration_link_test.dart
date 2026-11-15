import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:logistics_cryma_app/main.dart';
import 'package:logistics_cryma_app/providers/auth_provider.dart';
import 'package:logistics_cryma_app/router.dart';
import 'package:logistics_cryma_app/screens/auth/login_screen.dart';
import 'package:logistics_cryma_app/screens/auth/welcome_screen.dart';
import 'package:logistics_cryma_app/services/website_links.dart';
import 'package:provider/provider.dart';

const _urlLauncherChannel = MethodChannel('plugins.flutter.io/url_launcher');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('login offers the website courier link above Login',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

    final link = find.text('Go to Cryma.shop inorder to register as rider');
    final loginButton = find.widgetWithText(FilledButton, 'Login');

    expect(link, findsOneWidget);
    expect(tester.getTopLeft(link).dy,
        lessThan(tester.getTopLeft(loginButton).dy));
    expect(find.text('Create Account'), findsNothing);
  });

  testWidgets('the old in-app registration route redirects to Login',
      (tester) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final auth = AuthProvider();
    final router = createRouter(auth);
    addTearDown(auth.dispose);
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthProvider>.value(
        value: auth,
        child: CrymaApp(router: router),
      ),
    );
    router.go('/register');
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Apply as a rider'), findsNothing);
  });

  testWidgets('courier link opens the website registration page externally',
      (tester) async {
    MethodCall? launchCall;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_urlLauncherChannel, (call) async {
      launchCall = call;
      return true;
    });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_urlLauncherChannel, null);
    });

    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
    await tester.tap(
      find.text('Go to Cryma.shop inorder to register as rider'),
    );
    await tester.pumpAndSettle();

    expect(launchCall?.method, 'launch');
    final arguments = launchCall?.arguments as Map<Object?, Object?>;
    expect(arguments['url'], courierRegistrationUri.toString());
    expect(arguments['useWebView'], isFalse);
  });

  testWidgets('welcome application button opens the website registration page',
      (tester) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    MethodCall? launchCall;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_urlLauncherChannel, (call) async {
      launchCall = call;
      return true;
    });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_urlLauncherChannel, null);
    });

    await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));
    await tester.tap(find.text('Apply as a rider'));
    await tester.pumpAndSettle();

    expect(launchCall?.method, 'launch');
    final arguments = launchCall?.arguments as Map<Object?, Object?>;
    expect(arguments['url'], courierRegistrationUri.toString());
    expect(arguments['useWebView'], isFalse);
  });
}
