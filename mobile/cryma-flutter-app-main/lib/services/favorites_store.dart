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
    final ids = (await getIds()).toList();
    if (ids.isEmpty) return const [];
    // Fetch all wishlisted products in parallel rather than sequentially.
    final results = await Future.wait(
      ids.map((id) => loadProduct(id).then<Map<String, dynamic>?>(
            (p) => p,
          ).catchError(
            // Keep saved identifiers; a temporarily unavailable product
            // may return later. Return null and filter below.
            (_) => null,
          )),
    );
    return results.whereType<Map<String, dynamic>>().toList();
  }
}
