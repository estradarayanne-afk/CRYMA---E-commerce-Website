import 'package:shared_preferences/shared_preferences.dart';

class FavoritesStore {
  FavoritesStore._();
  static final FavoritesStore instance = FavoritesStore._();
  static const _key = 'cryma_buyer_favorites';

  Future<Set<String>> getIds() async {
    final prefs = await SharedPreferences.getInstance();
    final values = prefs.getStringList(_key) ?? const [];
    return values.toSet();
  }

  Future<bool> contains(String id) async => (await getIds()).contains(id);

  Future<void> toggle(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final values = (prefs.getStringList(_key) ?? const []).toSet();
    if (!values.add(id)) values.remove(id);
    await prefs.setStringList(_key, values.toList());
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }

  Future<List<Map<String, dynamic>>> loadProducts(
      Future<Map<String, dynamic>> Function(String id) loadProduct) async {
    final ids = await getIds();
    final products = <Map<String, dynamic>>[];
    for (final id in ids) {
      try {
        products.add(await loadProduct(id));
      } catch (_) {
        // Keep saved identifiers; a temporarily unavailable product can return later.
      }
    }
    return products;
  }
}
