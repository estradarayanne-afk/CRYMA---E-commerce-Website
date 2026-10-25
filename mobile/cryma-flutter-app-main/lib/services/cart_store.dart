import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CartStore {
  CartStore._();

  static final CartStore instance = CartStore._();
  static const _storageKey = 'cryma_cart_items';

  Future<List<Map<String, dynamic>>> items() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null) return [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];
    return decoded.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> add(Map<String, dynamic> item) async {
    final current = await items();
    final productId = (item['product_id'] ?? item['id']).toString();
    final variantId = item['variant_id']?.toString();
    final key = '$productId|${variantId ?? 'base'}';
    final existingIndex = current.indexWhere(
      (currentItem) =>
          currentItem['cart_key'] ==
          '${(currentItem['product_id'] ?? currentItem['id']).toString()}|'
              '${currentItem['variant_id']?.toString() ?? 'base'}',
    );
    if (existingIndex == -1) {
      current.add({
        ...item,
        'product_id': productId,
        'cart_key': key,
        'quantity': item['quantity'] ?? 1,
        'selected': true,
      });
    } else {
      current[existingIndex]['quantity'] =
          (current[existingIndex]['quantity'] as int? ?? 1) +
          (item['quantity'] as int? ?? 1);
    }
    await _save(current);
  }

  Future<void> save(List<Map<String, dynamic>> items) => _save(items);

  Future<void> clear() => _save([]);

  Future<void> _save(List<Map<String, dynamic>> items) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storageKey, jsonEncode(items));
  }
}
