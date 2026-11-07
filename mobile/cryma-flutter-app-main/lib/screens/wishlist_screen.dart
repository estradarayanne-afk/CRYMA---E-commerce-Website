import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/favorites_store.dart';
import '../utils/colors.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});
  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<Map<String, dynamic>> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final products = await FavoritesStore.instance.loadProducts(ApiService.instance.getProduct);
      if (!mounted) return;
      setState(() { _products = products; _loading = false; });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  Future<void> _remove(String id) async {
    await FavoritesStore.instance.toggle(id);
    await _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.transparent,
    appBar: AppBar(title: const Text('Wishlist'), backgroundColor: AppColors.white, foregroundColor: AppColors.primary, elevation: 0),
    body: _loading ? const Center(child: CircularProgressIndicator()) : _error != null
      ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(_error!, textAlign: TextAlign.center), TextButton(onPressed: _load, child: const Text('Retry'))]))
      : _products.isEmpty ? Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.favorite_border, size: 48, color: AppColors.primary), const SizedBox(height: 12), const Text('Your wishlist is empty', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, fontFamily: 'Poppins', color: AppColors.primary)), const SizedBox(height: 8), const Text('Favorites are saved on this device and are not synced across devices.', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Poppins', color: AppColors.gray, height: 1.4)), const SizedBox(height: 16), OutlinedButton(onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => route.isFirst), child: const Text('Continue shopping'))])))
      : RefreshIndicator(onRefresh: _load, child: ListView.builder(padding: const EdgeInsets.all(12), itemCount: _products.length, itemBuilder: (context, index) {
        final product = _products[index];
        final id = product['id'].toString();
        final image = (product['image'] ?? (product['images'] is List && (product['images'] as List).isNotEmpty ? product['images'][0] : '')).toString();
        final imageUrl = image.isEmpty ? '' : ApiService.instance.resolveImageUrl(image);
        return Card(child: ListTile(onTap: () => Navigator.pushNamed(context, '/product_detail', arguments: id).then((_) => _load()), leading: SizedBox(width: 56, height: 56, child: imageUrl.isEmpty ? const Icon(Icons.image_not_supported_outlined) : Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported_outlined))), title: Text(product['name']?.toString() ?? 'Product', maxLines: 2, overflow: TextOverflow.ellipsis), subtitle: Text('₱${product['price'] ?? '—'}'), trailing: IconButton(tooltip: 'Remove from wishlist', icon: const Icon(Icons.favorite, color: AppColors.primary), onPressed: () => _remove(id))));
      })),
  );
}
