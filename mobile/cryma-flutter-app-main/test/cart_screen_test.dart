import 'dart:convert';

import 'package:cryma_flutter_app/screens/cart/cart_screen.dart';
import 'package:cryma_flutter_app/services/cart_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('cart additions are capped at the available stock', () async {
    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([]),
    });

    final added = await CartStore.instance.add({
      'id': 'product-stock',
      'product_id': 'product-stock',
      'quantity': 5,
      'stock': 3,
    });

    expect(added, isTrue);
    expect((await CartStore.instance.items()).single['quantity'], 3);

    await CartStore.instance.add({
      'id': 'product-stock',
      'product_id': 'product-stock',
      'quantity': 1,
      'stock': 3,
    });

    expect((await CartStore.instance.items()).single['quantity'], 3);
  });

  testWidgets('manual cart quantity cannot exceed available stock',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({
      'cryma_cart_items_guest': jsonEncode([
        {
          'id': 'product-stock',
          'product_id': 'product-stock',
          'cart_key': 'product-stock|base',
          'name': 'Stock-limited product',
          'price': 100,
          'quantity': 2,
          'stock': 3,
          'image': '',
          'seller': 'Local Seller',
          'selected': true,
        },
      ]),
    });

    await tester.pumpWidget(const MaterialApp(home: CartScreen()));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit quantity'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), '4');
    await tester.tap(find.widgetWithText(FilledButton, 'Update'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a quantity from 1 to 3.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '3');
    await tester.tap(find.widgetWithText(FilledButton, 'Update'));
    await tester.pumpAndSettle();
    expect(find.text('Checkout (3)'), findsOneWidget);
  });

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
          'stock': 3,
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
