import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

/// Shared product card used by HomeScreen, SearchResultsScreen, and any
/// future screen that displays a product grid.
///
/// The card intentionally avoids managing state — wishlist state is owned
/// by the parent and communicated via [isFavorite] and [onToggleFavorite].
class ProductCard extends StatelessWidget {
  const ProductCard({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    required this.imageUrl,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onTap,
    super.key,
    this.discountedPrice,
    this.originalPrice,
    this.rating = 0,
    this.reviewCount = 0,
    this.salesCount = 0,
    this.sellerName = 'Local Seller',
    this.inStock = true,
    this.stockCount,
  });

  final String id;
  final String name;
  final String category;
  final String imageUrl;

  /// Current selling price (already discounted if applicable).
  final double price;

  /// Server-side discounted price — when set, this is the price shown to
  /// buyers; [price] becomes the original/strikethrough price.
  final double? discountedPrice;

  /// Original price before any discount. Shown struck-through when non-null
  /// and higher than the effective price.
  final double? originalPrice;

  final double rating;
  final int reviewCount;
  final int salesCount;
  final String sellerName;
  final bool isFavorite;
  final bool inStock;
  final int? stockCount;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;

  /// The price actually displayed as the headline price.
  double get _effectivePrice => discountedPrice ?? price;

  /// The price shown struck-through, when there is a discount.
  double? get _strikethroughPrice {
    if (discountedPrice != null && discountedPrice! < price) return price;
    if (originalPrice != null && originalPrice! > price) return originalPrice;
    return null;
  }

  bool get _isOnSale => _strikethroughPrice != null;

  int get _discountPercent {
    final original = _strikethroughPrice;
    if (original == null || original <= 0) return 0;
    return ((_effectivePrice - original).abs() / original * 100).round();
  }

  String _formatPrice(double value) {
    // Show whole number when the value has no cents.
    if (value == value.roundToDouble()) {
      return '₱${value.toInt()}';
    }
    return '₱${value.toStringAsFixed(2)}';
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── IMAGE AREA ──────────────────────────────────────────────
            Expanded(
              flex: 6,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _ProductImage(imageUrl: imageUrl),
                  // Sale badge
                  if (_isOnSale && _discountPercent > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: _SaleBadge(percent: _discountPercent),
                    ),
                  Positioned(
                    left: 8,
                    right: 8,
                    bottom: 8,
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: _SellerBadge(name: sellerName),
                    ),
                  ),
                  // Out-of-stock overlay
                  if (!inStock)
                    Positioned.fill(
                      child: ColoredBox(
                        color: Colors.black.withValues(alpha: 0.35),
                        child: const Center(
                          child: Text(
                            'Out of stock',
                            style: TextStyle(
                              color: Colors.white,
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                  // Wishlist button
                  Positioned(
                    top: 6,
                    right: 6,
                    child: _WishlistButton(
                      isFavorite: isFavorite,
                      onTap: onToggleFavorite,
                    ),
                  ),
                ],
              ),
            ),

            // ── CONTENT AREA ─────────────────────────────────────────────
            Expanded(
              flex: 5,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 7, 10, 9),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (category.trim().isNotEmpty)
                      Text(
                        category.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: AppColors.primary,
                        ),
                      ),
                    Text(
                      name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        height: 1.25,
                        color: AppColors.darkGray,
                      ),
                    ),
                    if (stockCount != null)
                      Text(
                        inStock ? '$stockCount available' : 'Out of stock',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color:
                              inStock ? AppColors.textSubtle : AppColors.danger,
                        ),
                      ),
                    if (rating > 0 || salesCount > 0)
                      _SocialProofRow(
                        rating: rating,
                        reviewCount: reviewCount,
                        salesCount: salesCount,
                      ),
                    _PriceRow(
                      effectivePrice: _formatPrice(_effectivePrice),
                      strikethroughPrice: _strikethroughPrice != null
                          ? _formatPrice(_strikethroughPrice!)
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-widgets
// ─────────────────────────────────────────────────────────────────────────────

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.imageUrl});
  final String imageUrl;

  ImageProvider? get _provider {
    if (imageUrl.isEmpty) return null;
    if (imageUrl.startsWith('http')) return NetworkImage(imageUrl);
    return AssetImage(imageUrl);
  }

  @override
  Widget build(BuildContext context) {
    final provider = _provider;
    if (provider == null) return const _ImageFallback();
    return Image(
      image: provider,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => const _ImageFallback(),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();
  @override
  Widget build(BuildContext context) => const ColoredBox(
        color: AppColors.softRose,
        child: Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            color: AppColors.borderStrong,
            size: 30,
          ),
        ),
      );
}

class _SaleBadge extends StatelessWidget {
  const _SaleBadge({required this.percent});
  final int percent;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.danger,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          '-$percent%',
          style: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
      );
}

class _SellerBadge extends StatelessWidget {
  const _SellerBadge({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(maxWidth: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: .75)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.storefront_outlined,
              color: AppColors.primaryDark,
              size: 12,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.primaryDark,
                  fontFamily: 'Poppins',
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      );
}

class _WishlistButton extends StatelessWidget {
  const _WishlistButton({required this.isFavorite, required this.onTap});
  final bool isFavorite;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: isFavorite ? 'Remove from wishlist' : 'Add to wishlist',
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.92),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isFavorite
                  ? Icons.favorite_rounded
                  : Icons.favorite_border_rounded,
              size: 18,
              color: isFavorite ? AppColors.danger : AppColors.textSubtle,
            ),
          ),
        ),
      );
}

class _RatingRow extends StatelessWidget {
  const _RatingRow({required this.rating, required this.reviewCount});
  final double rating;
  final int reviewCount;
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.star_rounded, size: 12, color: AppColors.gold),
        const SizedBox(width: 3),
        Flexible(
          child: Text(
            reviewCount > 0
                ? '${rating.toStringAsFixed(1)} · $reviewCount'
                : rating.toStringAsFixed(1),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: 'Poppins',
              fontSize: 9,
              color: AppColors.gray,
            ),
          ),
        ),
      ],
    );
  }
}

class _SocialProofRow extends StatelessWidget {
  const _SocialProofRow({
    required this.rating,
    required this.reviewCount,
    required this.salesCount,
  });

  final double rating;
  final int reviewCount;
  final int salesCount;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          if (rating > 0)
            Expanded(
              child: _RatingRow(rating: rating, reviewCount: reviewCount),
            ),
          if (rating > 0 && salesCount > 0) const SizedBox(width: 4),
          if (salesCount > 0)
            Flexible(
              child: Text(
                '$salesCount sold',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.end,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 9,
                  color: AppColors.gray,
                ),
              ),
            ),
        ],
      );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow({
    required this.effectivePrice,
    this.strikethroughPrice,
  });
  final String effectivePrice;
  final String? strikethroughPrice;
  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Flexible(
            child: Text(
              effectivePrice,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ),
          if (strikethroughPrice != null) ...[
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                strikethroughPrice!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 10,
                  color: AppColors.gray,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ),
          ],
        ],
      );
}

/// Helper that converts a raw product JSON map from the API into the
/// [ProductCard] fields without duplicating the logic across screens.
class ProductCardData {
  const ProductCardData._();

  static ProductCard fromJson({
    required Map<String, dynamic> json,
    required bool isFavorite,
    required VoidCallback onToggleFavorite,
    required VoidCallback onTap,
  }) {
    final rawImage = json['image']?.toString() ?? '';
    final images = json['images'] as List?;
    final firstImage = rawImage.isNotEmpty
        ? rawImage
        : (images != null && images.isNotEmpty)
            ? images.first.toString()
            : '';
    final imageUrl = firstImage.isEmpty
        ? ''
        : ApiService.instance.resolveImageUrl(firstImage);

    final price = double.tryParse(json['price']?.toString() ?? '') ?? 0;
    final discountedPrice =
        double.tryParse(json['discounted_price']?.toString() ?? '');
    final originalPrice =
        double.tryParse(json['original_price']?.toString() ?? '');
    final rating =
        double.tryParse(json['average_rating']?.toString() ?? '') ?? 0;
    final reviewCount = int.tryParse(
          (json['review_count'] ?? json['reviews_count'])?.toString() ?? '',
        ) ??
        0;
    final salesCount = int.tryParse(json['sales_count']?.toString() ?? '') ?? 0;
    final stock = int.tryParse(json['stock']?.toString() ?? '');
    final seller = json['seller'];
    final sellerProfile = seller is Map ? seller['seller_profile'] : null;
    final sellerName = sellerProfile is Map
        ? sellerProfile['business_name']?.toString().trim()
        : null;

    return ProductCard(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? 'Product',
      category: json['category']?.toString() ?? '',
      imageUrl: imageUrl,
      price: price,
      discountedPrice: discountedPrice,
      originalPrice: originalPrice,
      rating: rating,
      reviewCount: reviewCount,
      salesCount: salesCount,
      sellerName: sellerName == null || sellerName.isEmpty
          ? 'Local Seller'
          : sellerName,
      isFavorite: isFavorite,
      inStock: stock == null || stock > 0,
      stockCount: stock,
      onToggleFavorite: onToggleFavorite,
      onTap: onTap,
    );
  }
}
