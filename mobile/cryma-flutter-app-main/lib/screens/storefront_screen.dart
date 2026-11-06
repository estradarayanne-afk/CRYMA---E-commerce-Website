import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

class StorefrontScreen extends StatefulWidget {
  const StorefrontScreen({super.key, required this.slug});
  final String slug;
  @override
  State<StorefrontScreen> createState() => _StorefrontScreenState();
}

class _StorefrontScreenState extends State<StorefrontScreen> {
  Map<String, dynamic>? _data;
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
      final data = await ApiService.instance.getStorefront(widget.slug);
      if (!mounted) return;
      setState(() {
        _data = data;
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

  @override
  Widget build(BuildContext context) {
    final store = _data?['store'] as Map<String, dynamic>?;
    final products = (_data?['products'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
          title: Text(store?['name']?.toString() ?? 'Storefront'),
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.primary,
          elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(_error!, textAlign: TextAlign.center),
                  TextButton(onPressed: _load, child: const Text('Retry'))
                ]))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: CustomScrollView(slivers: [
                    SliverToBoxAdapter(
                        child: Container(
                            width: double.infinity,
                            margin: const EdgeInsets.all(12),
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                                color: AppColors.white,
                                borderRadius: BorderRadius.circular(16)),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(store?['name']?.toString() ?? 'Store',
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineSmall
                                          ?.copyWith(
                                              color: AppColors.primary,
                                              fontWeight: FontWeight.bold)),
                                  if ((store?['tagline'] ?? '')
                                      .toString()
                                      .isNotEmpty)
                                    Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child:
                                            Text(store!['tagline'].toString())),
                                  if ((store?['description'] ?? '')
                                      .toString()
                                      .isNotEmpty)
                                    Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(
                                            store!['description'].toString())),
                                  const SizedBox(height: 12),
                                  Text('${products.length} products',
                                      style: const TextStyle(
                                          color: AppColors.gray))
                                ]))),
                    if (products.isEmpty)
                      const SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                              child: Text(
                                  'This store has no active products right now.')))
                    else
                      SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
                          sliver: SliverGrid(
                              delegate:
                                  SliverChildBuilderDelegate((context, index) {
                                final product = products[index];
                                final id = product['id'].toString();
                                final rawImage = (product['image'] ??
                                        (product['images'] is List &&
                                                (product['images'] as List)
                                                    .isNotEmpty
                                            ? product['images'][0]
                                            : ''))
                                    .toString();
                                final image = rawImage.isEmpty
                                    ? ''
                                    : ApiService.instance
                                        .resolveImageUrl(rawImage);
                                return Card(
                                    clipBehavior: Clip.antiAlias,
                                    child: InkWell(
                                        onTap: () => Navigator.pushNamed(
                                            context, '/product_detail',
                                            arguments: id),
                                        child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                  child: SizedBox(
                                                      width: double.infinity,
                                                      child: image.isEmpty
                                                          ? const Icon(
                                                              Icons
                                                                  .image_not_supported_outlined,
                                                              color: AppColors
                                                                  .gray)
                                                          : Image.network(image,
                                                              fit: BoxFit.cover,
                                                              width: double
                                                                  .infinity,
                                                              errorBuilder: (_,
                                                                      __,
                                                                      ___) =>
                                                                  const Icon(
                                                                      Icons
                                                                          .image_not_supported_outlined,
                                                                      color: AppColors
                                                                          .gray)))),
                                              Padding(
                                                  padding:
                                                      const EdgeInsets.all(10),
                                                  child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      children: [
                                                        Text(
                                                            product['name']
                                                                    ?.toString() ??
                                                                'Product',
                                                            maxLines: 2,
                                                            overflow:
                                                                TextOverflow
                                                                    .ellipsis),
                                                        const SizedBox(
                                                            height: 4),
                                                        Text(
                                                            '₱${product['price'] ?? '—'}',
                                                            style: const TextStyle(
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold,
                                                                color: AppColors
                                                                    .primary))
                                                      ]))
                                            ])));
                              }, childCount: products.length),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      crossAxisSpacing: 10,
                                      mainAxisSpacing: 10,
                                      mainAxisExtent: 245))),
                  ])),
    );
  }
}
