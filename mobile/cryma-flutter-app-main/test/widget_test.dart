import 'dart:convert';

import 'package:cryma_flutter_app/models/buyer_category.dart';
import 'package:cryma_flutter_app/screens/account/account_screen.dart';
import 'package:cryma_flutter_app/screens/auth/signup/register_account_screen.dart';
import 'package:cryma_flutter_app/screens/auth/signup/register_id_screen.dart';
import 'package:cryma_flutter_app/screens/auth/signup/register_personal_screen.dart';
import 'package:cryma_flutter_app/screens/auth/signup/register_review_screen.dart';
import 'package:cryma_flutter_app/screens/onboarding/welcome_screen.dart';
import 'package:cryma_flutter_app/screens/auth/login/login_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:cryma_flutter_app/utils/buyer_registration.dart';
import 'package:cryma_flutter_app/utils/philippine_postal_code_lookup.dart';
import 'package:cryma_flutter_app/widgets/buyer_bottom_navigation_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  void setMobileViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('full-screen welcome landing renders without paint errors',
      (tester) async {
    setMobileViewport(tester);

    await tester.pumpWidget(
      MaterialApp(
        home: const WelcomeScreen(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/register_personal': (_) => const RegisterPersonalScreen(),
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('A MARKETPLACE THAT FEELS CLOSER.'), findsOneWidget);
    expect(find.text('Good things\nmove closer.'), findsOneWidget);
    expect(find.text('Explore the marketplace'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Already have an account? '), findsOneWidget);
    expect(find.text('CRYMA'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('welcome landing fits smaller phones and keeps actions visible',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: const WelcomeScreen(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/register_personal': (_) => const RegisterPersonalScreen(),
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Explore the marketplace'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('buyer sign-in offers registration and guest entry',
      (tester) async {
    setMobileViewport(tester);

    await tester.pumpWidget(
      const MaterialApp(home: LoginScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('EMAIL ADDRESS'), findsOneWidget);
    expect(find.text('PASSWORD'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
    expect(find.text('CONTINUE AS GUEST'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('buyer sign-up first step renders without layout errors',
      (tester) async {
    setMobileViewport(tester);

    await tester.pumpWidget(
      const MaterialApp(home: RegisterPersonalScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Personal information'), findsOneWidget);
    expect(find.text('Step 1 of 5: Personal Information'), findsOneWidget);
    expect(find.text('FIRST NAME *'), findsOneWidget);
    expect(find.text('MIDDLE INITIAL'), findsOneWidget);
    expect(find.text('LAST NAME *'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.text('Already have an account? Sign in'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('account step shows outlined credentials and live password score',
      (tester) async {
    setMobileViewport(tester);

    await tester.pumpWidget(
      const MaterialApp(home: RegisterAccountScreen()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Account security'), findsOneWidget);
    expect(find.text('Email address *'), findsOneWidget);
    expect(find.text('Password *'), findsOneWidget);
    expect(find.text('Confirm password *'), findsOneWidget);

    await tester.enterText(
      find.byType(TextFormField).at(1),
      'Password123',
    );
    await tester.pumpAndSettle();

    expect(find.text('Good password'), findsOneWidget);
    expect(find.text('3/4'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ID verification explains upload requirements accessibly',
      (tester) async {
    setMobileViewport(tester);

    await tester.pumpWidget(
      const MaterialApp(home: RegisterIDScreen()),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Upload Government ID (JPG, PNG, PDF)'),
      findsOneWidget,
    );
    expect(find.text('Choose file'), findsOneWidget);
    expect(find.text('Maximum file size: 5 MB'), findsOneWidget);
    expect(find.text('Accepted government IDs'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('review groups registration details with edit actions',
      (tester) async {
    setMobileViewport(tester);
    final api = ApiService(
      baseUrl: 'https://test.example/',
      client: MockClient((_) async => http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'terms': {'version': 'terms-v1'},
                'privacy': {'version': 'privacy-v1'},
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          )),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: RegisterReviewScreen(
          apiService: api,
          data: const {
            'personalData': {
              'firstName': 'Ciara',
              'middleInitial': 'J.',
              'lastName': 'Cambel',
              'sex': 'female',
              'birthday': '2008-11-04',
              'age': '18',
            },
            'contactData': {
              'contactNumber': '09613451348',
              'email': 'buyer@example.test',
            },
            'addressData': {
              'region': 'Region IV-A',
              'province': 'Quezon',
              'municipality': 'Buenavista',
              'barangay': 'Buenavista',
              'houseNumber': '12',
              'street': 'Market Street',
              'postalCode': '4320',
            },
            'idFile': r'C:\files\buyer-id.jpg',
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Personal information'), findsOneWidget);
    expect(find.text('Contact and delivery address'), findsOneWidget);
    expect(find.text('Login credentials'), findsOneWidget);
    expect(find.text('Verification document'), findsOneWidget);
    expect(find.text('11/04/2008'), findsOneWidget);
    expect(find.text('+63 9613451348'), findsOneWidget);
    expect(find.text('buyer@example.test'), findsOneWidget);
    expect(find.text('Market Street'), findsOneWidget);
    expect(find.text('buyer-id.jpg'), findsOneWidget);
    expect(find.text('Edit'), findsNWidgets(4));
    expect(tester.takeException(), isNull);
  });

  test('registration name formatter capitalizes each name word', () {
    expect(
      BuyerRegistrationRules.capitalizeNameWords("ana maria o'brien"),
      "Ana Maria O'Brien",
    );
    expect(
      BuyerRegistrationRules.capitalizeNameWords('jean-luc'),
      'Jean-Luc',
    );
  });

  test('latest eligible birthday is exactly 18 years before today', () {
    expect(
      BuyerRegistrationRules.latestEligibleBirthday(
        today: DateTime(2026, 11, 6),
      ),
      DateTime(2008, 11, 6),
    );
    expect(
      BuyerRegistrationRules.latestEligibleBirthday(
        today: DateTime(2024, 2, 29),
      ),
      DateTime(2006, 2, 28),
    );
  });

  testWidgets('postal lookup suggests an unambiguous locality code',
      (tester) async {
    expect(
      await tester.runAsync(
        () => PhilippinePostalCodeLookup.forLocality('Benguet', 'Baguio'),
      ),
      '2600',
    );
  });

  testWidgets('primary buyer navigation stays labeled and easy to select',
      (tester) async {
    setMobileViewport(tester);
    var selectedIndex = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: BuyerBottomNavigationBar(
            currentIndex: selectedIndex,
            onDestinationSelected: (index) => selectedIndex = index,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    for (final label in ['Home', 'Browse', 'Cart', 'Orders', 'Account']) {
      expect(find.text(label), findsOneWidget);
    }

    await tester.tap(find.text('Browse'));
    await tester.pumpAndSettle();

    expect(selectedIndex, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('switching buyer tabs keeps a single tab route on the stack',
      (tester) async {
    setMobileViewport(tester);
    final navigatorKey = GlobalKey<NavigatorState>();

    Widget tabPage(String label, int currentIndex) {
      return Builder(
        builder: (context) => Scaffold(
          body: Center(child: Text(label)),
          bottomNavigationBar: BuyerBottomNavigationBar(
            currentIndex: currentIndex,
            onDestinationSelected: (index) =>
                BuyerBottomNavigationBar.navigateToTab(
              context,
              index,
              currentIndex,
            ),
          ),
        ),
      );
    }

    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        initialRoute: '/home',
        routes: {
          '/': (_) => const Scaffold(body: Text('Root')),
          '/home': (_) => tabPage('Home page', 0),
          '/categories': (_) => tabPage('Categories page', 1),
          '/cart': (_) => tabPage('Cart page', 2),
          '/my_orders': (_) => tabPage('Orders page', 3),
          '/account': (_) => tabPage('Account page', 4),
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Browse'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();

    expect(find.text('Home page'), findsOneWidget);
    navigatorKey.currentState!.pop();
    await tester.pumpAndSettle();
    expect(find.text('Root'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('buyer category list matches the shared canonical categories', () {
    expect(
      buyerCategories.map((category) => category.name).toList(),
      [
        'Pet Supplies',
        'Electronics & Gadgets',
        "Women's Apparel",
        "Men's Apparel",
        'Kids & Baby',
        'Home & Garden',
        'Sports & Outdoors',
        'Health & Beauty',
        'Books & Media',
        'Food & Gourmet',
        'Automotive & Motorcycle',
        'Furniture & Office Equipment',
        'Jewelry & Watches',
        'Office & School Supplies',
      ],
    );
  });

  test('buyer order status filters are sent to the shared API', () async {
    SharedPreferences.setMockInitialValues({'cryma_api_token': 'test-token'});
    Uri? requestedUri;
    Map<String, String>? requestedHeaders;
    final service = ApiService(
      baseUrl: 'http://localhost',
      client: MockClient((request) async {
        requestedUri = request.url;
        requestedHeaders = request.headers;
        return http.Response(
          jsonEncode({
            'data': {
              'data': [],
              'current_page': 1,
              'last_page': 1,
              'total': 0,
            },
          }),
          200,
        );
      }),
    );

    await service.getBuyerOrdersPage(status: 'preparing');

    expect(requestedUri?.path, '/api/orders');
    expect(requestedUri?.queryParameters['status'], 'preparing');
    expect(requestedHeaders?['Authorization'], 'Bearer test-token');
  });

  testWidgets(
      'guest account offers sign-in and registration, not profile tools',
      (tester) async {
    setMobileViewport(tester);
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      MaterialApp(
        home: const AccountScreen(),
        routes: {
          '/login': (_) => const Scaffold(body: Text('Sign-in screen')),
          '/register_personal': (_) =>
              const Scaffold(body: Text('Registration screen')),
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Your CRYMA account'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
    expect(find.text('Edit Profile'), findsNothing);
    expect(find.text('Address Book'), findsNothing);

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Sign-in screen'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
