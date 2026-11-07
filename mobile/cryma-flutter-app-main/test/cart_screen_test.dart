import 'dart:convert';

import 'package:cryma_flutter_app/screens/cart_screen.dart';
import 'package:cryma_flutter_app/services/cart_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('cart removal asks for confirmation before deleting items',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([
        {
          'id': 'product-1',
          'product_id': 'product-1',
          'cart_key': 'product-1|base',
          'name': 'Everyday Tote',
          'color': 'Rose',
          'price': 500,
          'quantity': 1,
          'image': '',
          'seller': 'Local Seller',
          'selected': true,
        },
      ]),
    });

    await tester.pumpWidget(const MaterialApp(home: CartScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Everyday Tote'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byTooltip('Remove selected items'));
    await tester.pumpAndSettle();
    expect(find.text('Remove selected items?'), findsOneWidget);

    await tester.tap(find.text('Keep items'));
    await tester.pumpAndSettle();
    expect(find.text('Everyday Tote'), findsOneWidget);

    await tester.tap(find.byTooltip('Remove selected items'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
    await tester.pumpAndSettle();

    expect(find.text('Your cart is empty'), findsOneWidget);
    expect(await CartStore.instance.items(), isEmpty);
  });
}
