import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../services/favorites_store.dart';
import '../../utils/colors.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  List<Map<String, dynamic>> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final products =
          await FavoritesStore.instance.loadProducts(_api.getProduct);
      if (!mounted) return;
      setState(() {
        _products = products;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _remove(String id) async {
    await FavoritesStore.instance.toggle(id);
    await _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          toolbarHeight: 72,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Wishlist'),
              const SizedBox(height: 2),
              Text(
                '${_products.length} saved ${_products.length == 1 ? 'item' : 'items'}',
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSubtle,
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.wine,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 19,
            fontWeight: FontWeight.w700,
            color: AppColors.wine,
          ),
          actions: [
            IconButton(
              tooltip: 'Refresh wishlist',
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _stateMessage(
                    icon: Icons.wifi_off_rounded,
                    title: 'Unable to load wishlist',
                    detail: _error!,
                    action: 'Retry',
                    onPressed: _load,
                  )
                : _products.isEmpty
                    ? _stateMessage(
                        icon: Icons.favorite_border_rounded,
                        title: 'Your wishlist is empty',
                        detail:
                            'Save items you love and they will be waiting here for you.',
                        action: 'Continue shopping',
                        onPressed: () => Navigator.pushNamedAndRemoveUntil(
                          context,
                          '/home',
                          (route) => route.isFirst,
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppColors.primary,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                          itemCount: _products.length + 1,
                          itemBuilder: (context, index) {
                            if (index == 0) {
                              return const Padding(
                                padding: EdgeInsets.fromLTRB(4, 4, 4, 12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'SAVED ITEMS',
                                        style: TextStyle(
                                          fontFamily: 'Poppins',
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.7,
                                          color: AppColors.textSubtle,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      'Tap an item to view details',
                                      style: TextStyle(
                                        fontFamily: 'Poppins',
                                        fontSize: 10,
                                        color: AppColors.textSubtle,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }
                            return _productCard(_products[index - 1]);
                          },
                        ),
                      ),
      );

  Widget _stateMessage({
    required IconData icon,
    required String title,
    required String detail,
    required String action,
    required VoidCallback onPressed,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.softRose,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(icon, size: 34, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.darkGray,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12,
                color: AppColors.textSubtle,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: onPressed,
              child: Text(action),
            ),
          ],
        ),
      ),
    );
  }

  Widget _productCard(Map<String, dynamic> product) {
    final id = product['id'].toString();
    final rawImages = product['images'];
    final image = (product['image'] ??
            (rawImages is List && rawImages.isNotEmpty ? rawImages.first : ''))
        .toString();
    final imageUrl = image.isEmpty ? '' : _api.resolveImageUrl(image);

    return Container(
      margin: const EdgeInsets.only(bottom: 11),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderNeutral),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => Navigator.pushNamed(
            context,
            '/product_detail',
            arguments: id,
          ).then((_) => _load()),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: SizedBox(
                    width: 76,
                    height: 76,
                    child: imageUrl.isEmpty
                        ? _imagePlaceholder()
                        : Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _imagePlaceholder(),
                          ),
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product['name']?.toString() ?? 'Product',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkGray,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 9),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '₱${product['price'] ?? '—'}',
                              style: const TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const Text(
                            'View item',
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSubtle,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            Icons.chevron_right_rounded,
                            size: 15,
                            color: AppColors.textSubtle,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  tooltip: 'Remove from wishlist',
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.dangerSoft,
                    foregroundColor: AppColors.danger,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.favorite_rounded, size: 19),
                  onPressed: () => _remove(id),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _imagePlaceholder() => Container(
        color: AppColors.surfaceNeutral,
        child: const Icon(
          Icons.image_not_supported_outlined,
          color: AppColors.textSubtle,
        ),
      );
}
