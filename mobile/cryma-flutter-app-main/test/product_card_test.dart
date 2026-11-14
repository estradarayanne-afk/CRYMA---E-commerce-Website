import 'package:cryma_flutter_app/widgets/product_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
      'mobile product cards show real details and keep actions tappable',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var favoriteTaps = 0;
    var productTaps = 0;
    const productName =
        'Handmade woven everyday shoulder tote with inner pocket';
    const sellerName = 'Nora Home and Gift Market';
    final card = ProductCardData.fromJson(
      json: {
        'id': 42,
        'name': productName,
        'category': 'Handmade bags and accessories',
        'price': '850.00',
        'discounted_price': '750.00',
        'stock': 8,
        'average_rating': '4.8',
        'reviews_count': 128,
        'sales_count': 205,
        'seller': {
          'seller_profile': {'business_name': sellerName},
        },
      },
      isFavorite: false,
      onToggleFavorite: () => favoriteTaps++,
      onTap: () => productTaps++,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GridView.count(
            padding: const EdgeInsets.all(16),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.56,
            children: [card, const SizedBox.shrink()],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text(productName), findsOneWidget);
    expect(find.text(sellerName), findsOneWidget);
    expect(find.text('8 available'), findsOneWidget);
    expect(find.text('205 sold'), findsOneWidget);
    expect(find.text('Local Seller'), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pump();
    expect(favoriteTaps, 1);
    expect(productTaps, 0);

    await tester.tap(find.text(productName));
    await tester.pump();
    expect(productTaps, 1);
  });
}
