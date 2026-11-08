import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CartStore {
  CartStore._();

  static final CartStore instance = CartStore._();
  static const _storagePrefix = 'cryma_cart_items';

  Future<String> _storageKey() async {
    final preferences = await SharedPreferences.getInstance();
    final rawUser = preferences.getString('cryma_api_user');
    if (rawUser == null) return '${_storagePrefix}_guest';
    try {
      final user = jsonDecode(rawUser);
      final id = user is Map ? user['id']?.toString() : null;
      if (id != null && id.isNotEmpty) return '${_storagePrefix}_buyer_$id';
    } catch (_) {
      // Fall back to an anonymous cart if cached account data is invalid.
    }
    return '${_storagePrefix}_guest';
  }

  Future<List<Map<String, dynamic>>> items() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(await _storageKey());
    if (raw == null) return [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];
    return decoded.whereType<Map<String, dynamic>>().toList();
  }

  Future<bool> add(Map<String, dynamic> item) async {
    final current = await items();
    final productId = (item['product_id'] ?? item['id']).toString();
    final variantId = item['variant_id']?.toString();
    final key = '$productId|${variantId ?? 'base'}';
    final availableStock = int.tryParse(item['stock']?.toString() ?? '');
    if (availableStock != null && availableStock < 1) return false;
    final existingIndex = current.indexWhere(
      (currentItem) =>
          currentItem['cart_key'] ==
          '${(currentItem['product_id'] ?? currentItem['id']).toString()}|'
              '${currentItem['variant_id']?.toString() ?? 'base'}',
    );
    if (existingIndex == -1) {
      final quantity = int.tryParse(item['quantity']?.toString() ?? '') ?? 1;
      current.add({
        ...item,
        'product_id': productId,
        'cart_key': key,
        'quantity': availableStock == null
            ? quantity.clamp(1, 99)
            : quantity.clamp(1, availableStock),
        'selected': true,
      });
    } else {
      final currentQuantity =
          int.tryParse(current[existingIndex]['quantity']?.toString() ?? '') ??
              1;
      final addedQuantity =
          int.tryParse(item['quantity']?.toString() ?? '') ?? 1;
      final requested = currentQuantity + addedQuantity;
      current[existingIndex]['quantity'] = availableStock == null
          ? requested.clamp(1, 99)
          : requested.clamp(1, availableStock);
      if (availableStock != null) {
        current[existingIndex]['stock'] = availableStock;
      }
    }
    await _save(current);
    return true;
  }

  Future<void> save(List<Map<String, dynamic>> items) => _save(items);

  Future<void> clear() => _save([]);

  Future<void> _save(List<Map<String, dynamic>> items) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(await _storageKey(), jsonEncode(items));
  }
}
