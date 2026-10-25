import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/cart_store.dart';
import '../utils/colors.dart';

class ProductsDetailScreen extends StatefulWidget {
  const ProductsDetailScreen({super.key, this.productId});

  final String? productId;

  @override
  State<ProductsDetailScreen> createState() => _ProductsDetailScreenState();
}

class _ProductsDetailScreenState extends State<ProductsDetailScreen> {
  // ============================================================
  // PRODUCT DATA
  // ============================================================

  Map<String, dynamic> _product = {
    'id': '1',
    'name': 'Anker Soundcore Q35 Wireless Headphones',
    'price': 2499,
    'originalPrice': 3299,
    'rating': 4.7,
    'reviews': 842,
    'sold': 1200,
    'category': 'ELECTRONICS',
    'images': [
      'assets/image/headphones.jpg',
      'assets/image/headphones.jpg',
      'assets/image/headphones.jpg',
      'assets/image/headphones.jpg',
    ],
    'colors': ['Black', 'Blue', 'White'],
    'stock': 25,
    'discount': 24,
  };

  // ============================================================
  // SPECIFICATION DATA
  // ============================================================
  List<Map<String, String>> get _specifications => [
        {'label': 'Category', 'value': _product['category'].toString()},
        {
          'label': 'Seller',
          'value': _product['seller']?.toString() ?? 'Seller'
        },
        {'label': 'Available Stock', 'value': _currentStock.toString()},
      ];

  String _selectedImage = '';
  String _selectedColor = 'Black';
  int _quantity = 1;
  List<Map<String, dynamic>> _variants = [];
  final List<Map<String, dynamic>> _reviews = [];
  String? _selectedVariantId;
  bool _isLoading = true;
  String? _loadError;

  Map<String, dynamic>? get _selectedVariant {
    for (final variant in _variants) {
      if (variant['id']?.toString() == _selectedVariantId) return variant;
    }
    return null;
  }

  int get _currentStock =>
      int.tryParse(_selectedVariant?['stock']?.toString() ?? '') ??
      (_product['stock'] as int? ?? 0);

  int get _currentPrice => (double.tryParse(
            (_selectedVariant?['discounted_price'] ??
                    _selectedVariant?['price'] ??
                    _product['price'])
                .toString(),
          ) ??
          0)
      .round();

  ImageProvider _imageProvider(String path) {
    if (path.startsWith('http')) return NetworkImage(path);
    return AssetImage(path.isEmpty ? 'assets/image/headphones.jpg' : path);
  }

  @override
  void initState() {
    super.initState();
    _selectedImage = _product['images'][0];
    _loadProduct();
  }

  Future<void> _loadProduct() async {
    if (widget.productId == null) {
      setState(() {
        _isLoading = false;
        _loadError = 'No product was selected.';
      });
      return;
    }
    try {
      final json = await ApiService.instance.getProduct(widget.productId!);
      final rawImages = json['images'] as List? ?? [];
      final imagePaths = rawImages
          .map((image) => ApiService.instance.resolveImageUrl(image.toString()))
          .toList();
      if (imagePaths.isEmpty && json['image'] != null) {
        imagePaths.add(
          ApiService.instance.resolveImageUrl(json['image'].toString()),
        );
      }
      final variants = (json['variants'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();
      final price = double.tryParse(json['price']?.toString() ?? '') ?? 0;
      final originalPrice =
          double.tryParse(json['original_price']?.toString() ?? '') ?? price;
      final options = variants
          .map(
            (variant) => [
              variant['color']?.toString(),
              variant['size']?.toString(),
            ].where((value) => value != null && value.isNotEmpty).join(' / '),
          )
          .where((option) => option.isNotEmpty)
          .toSet()
          .toList();
      if (!mounted) return;
      setState(() {
        _variants = variants;
        _product = {
          'id': json['id'].toString(),
          'name': json['name']?.toString() ?? 'Product',
          'price': price.round(),
          'originalPrice': originalPrice.round(),
          'rating':
              double.tryParse(json['average_rating']?.toString() ?? '') ?? 0,
          'reviews': json['reviews_count'] ?? 0,
          'sold': json['sales_count'] ?? 0,
          'category': json['category']?.toString() ?? 'Other',
          'images': imagePaths.isEmpty ? [''] : imagePaths,
          'colors': options,
          'stock': int.tryParse(json['stock']?.toString() ?? '') ?? 0,
          'discount': originalPrice > 0
              ? ((originalPrice - price) / originalPrice * 100).round()
              : 0,
          'description': json['description']?.toString() ?? '',
          'seller': json['seller'] is Map<String, dynamic>
              ? '${json['seller']['first_name'] ?? ''} ${json['seller']['last_name'] ?? ''}'
                  .trim()
              : 'CRYMA Seller',
        };
        _selectedImage = imagePaths.isEmpty ? '' : imagePaths.first;
        _selectedColor = options.isEmpty ? 'Standard' : options.first;
        if (variants.isNotEmpty) {
          _selectedVariantId = variants.first['id']?.toString();
        }
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error.toString();
        _isLoading = false;
      });
    }
  }

  // ============================================================
  // QUANTITY
  // ============================================================
  void _increaseQuantity() {
    if (_quantity < _currentStock) {
      setState(() {
        _quantity++;
      });
    }
  }

  void _decreaseQuantity() {
    if (_quantity > 1) {
      setState(() {
        _quantity--;
      });
    }
  }

  // ============================================================
  // ADD TO CART
  // ============================================================
  Future<void> _addToCart({bool openCheckout = false}) async {
    final selectedVariant = _selectedVariant;
    final variantPrice = selectedVariant == null
        ? null
        : selectedVariant['discounted_price'] ?? selectedVariant['price'];
    final item = <String, dynamic>{
      'id': _product['id'].toString(),
      'name': _product['name'],
      'price': variantPrice?.toString() ?? _product['price'],
      'quantity': _quantity,
      'image': _selectedImage,
      'seller': _product['seller'],
      'color': _selectedColor,
      'selected': true,
    };
    if (_selectedVariantId != null) item['variant_id'] = _selectedVariantId;
    await CartStore.instance.add(item);
    if (!mounted) return;
    if (openCheckout) {
      Navigator.pushNamed(context, '/checkout');
      return;
    }
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$_quantity item(s) added to cart',
          style: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: const Duration(seconds: 2),
        action: SnackBarAction(
          label: 'View Cart',
          textColor: AppColors.white,
          onPressed: () => Navigator.pushNamed(context, '/cart'),
        ),
      ),
    );
  }

  // ============================================================
  // BUY NOW
  // ============================================================
  Future<void> _buyNow() => _addToCart(openCheckout: true);

  // ============================================================
  // BUILD
  // ============================================================
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_loadError != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_loadError!, textAlign: TextAlign.center),
                TextButton(onPressed: _loadProduct, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }
    return Scaffold(
      backgroundColor: AppColors.white,

      // FIXED BOTTOM BUTTONS
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          color: AppColors.white,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
          child: Row(
            children: [
              // ADD TO CART
              Expanded(
                child: SizedBox(
                  height: 54,
                  child: OutlinedButton(
                    onPressed: _currentStock > 0 ? _addToCart : null,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(
                        color: AppColors.primary,
                        width: 2,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Add to Cart',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // BUY NOW
              Expanded(
                child: SizedBox(
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _currentStock > 0 ? _buyNow : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Buy Now',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.white,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),

      // BODY
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              height: 64,
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    icon: const Icon(
                      Icons.arrow_back,
                      size: 30,
                      color: AppColors.primary,
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Row(
                    children: [
                      IconButton(
                        padding: EdgeInsets.zero,
                        icon: const Icon(
                          Icons.favorite_border,
                          size: 30,
                          color: AppColors.primary,
                        ),
                        onPressed: () {},
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        padding: EdgeInsets.zero,
                        icon: const Icon(
                          Icons.share_outlined,
                          size: 29,
                          color: AppColors.primary,
                        ),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // SCROLLABLE CONTENT
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMainImage(),
                    _buildThumbnails(),
                    _buildProductInfo(),
                    _buildSpecificationSection(),
                    _buildReviewsSection(context), // ✅ Pass context
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // MAIN IMAGE
  // ============================================================
  Widget _buildMainImage() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            height: MediaQuery.of(context).size.width * 0.72,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F1F1),
              borderRadius: BorderRadius.circular(26),
            ),
            clipBehavior: Clip.antiAlias,
            child: Image(
              image: _imageProvider(_selectedImage),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: const Color(0xFFE9E9E9),
                  child: const Center(
                    child: Icon(
                      Icons.image_not_supported_outlined,
                      size: 45,
                      color: AppColors.gray,
                    ),
                  ),
                );
              },
            ),
          ),
          if ((_product['discount'] as int? ?? 0) > 0)
            Positioned(
              top: 14,
              right: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: AppColors.danger,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  '-${_product['discount']}%',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.white,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ============================================================
  // THUMBNAILS
  // ============================================================
  Widget _buildThumbnails() {
    return SizedBox(
      height: 88,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        scrollDirection: Axis.horizontal,
        itemCount: _product['images'].length,
        separatorBuilder: (context, index) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final String imagePath = _product['images'][index] as String;
          final bool isActive = _selectedImage == imagePath && index == 0;

          return GestureDetector(
            onTap: () => setState(() => _selectedImage = imagePath),
            child: Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F3F3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isActive ? AppColors.primary : const Color(0xFFE5E5E5),
                  width: isActive ? 2 : 1,
                ),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image(
                image: _imageProvider(imagePath),
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const Center(
                    child: Icon(
                      Icons.image_not_supported_outlined,
                      size: 22,
                      color: AppColors.gray,
                    ),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }

  // ============================================================
  // PRODUCT INFORMATION
  // ============================================================
  Widget _buildProductInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      color: AppColors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // CATEGORY
          Text(
            _product['category'],
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1,
              color: AppColors.primary,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 5),

          // PRODUCT NAME
          Text(
            _product['name'],
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 20,
              height: 1.25,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),

          // RATING
          Row(
            children: [
              Row(
                children: List.generate(
                  5,
                  (index) => const Padding(
                    padding: EdgeInsets.only(right: 2),
                    child: Icon(Icons.star, size: 17, color: AppColors.gold),
                  ),
                ),
              ),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  '${_product['rating']} · ${_product['reviews']} reviews',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // PRICE
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '₱$_currentPrice',
                style: const TextStyle(
                  fontSize: 25,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '₱${_product['originalPrice']}',
                style: const TextStyle(
                  fontSize: 14,
                  decoration: TextDecoration.lineThrough,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFEEEE),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '-${_product['discount']}%',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.danger,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // COLOR
          const Text(
            'Color',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 7),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: (_product['colors'] as List<String>).map<Widget>((
                color,
              ) {
                final bool isSelected = _selectedColor == color;
                final Map<String, Color> colorMap = {
                  'Black': Colors.black,
                  'Blue': Colors.blue,
                  'White': Colors.grey,
                };

                return GestureDetector(
                  onTap: () {
                    final variant = _variants.firstWhere(
                      (row) =>
                          [row['color']?.toString(), row['size']?.toString()]
                              .where(
                                (value) => value != null && value.isNotEmpty,
                              )
                              .join(' / ') ==
                          color,
                    );
                    setState(() {
                      _selectedColor = color;
                      _selectedVariantId = variant['id']?.toString();
                      _quantity = 1;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 9),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFFF1F7F7)
                          : AppColors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : const Color(0xFFE5E5E5),
                        width: isSelected ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 15,
                          height: 15,
                          decoration: BoxDecoration(
                            color: colorMap[color] ?? Colors.grey,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          color,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight:
                                isSelected ? FontWeight.w600 : FontWeight.w400,
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.darkGray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // QUANTITY
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Quantity',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkGray,
                  fontFamily: 'Poppins',
                ),
              ),
              Row(
                children: [
                  GestureDetector(
                    onTap: _decreaseQuantity,
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE5E5E5)),
                      ),
                      child: const Center(
                        child: Text(
                          '−',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w500,
                            color: AppColors.darkGray,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 17),
                  Text(
                    '$_quantity',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(width: 17),
                  GestureDetector(
                    onTap: _increaseQuantity,
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE5E5E5)),
                      ),
                      child: const Center(
                        child: Text(
                          '+',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w500,
                            color: AppColors.darkGray,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 7),

          // STOCK
          Text(
            'Available Stock: $_currentStock units',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.gray,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // SPECIFICATION SECTION
  // ============================================================
  Widget _buildSpecificationSection() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Specification',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 12),
          ..._specifications.map(
            (spec) => _buildSpecRow(spec['label']!, spec['value']!),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.gray,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // REVIEWS SECTION — ✅ CLICKABLE NA ANG "SEE ALL"
  // ============================================================
  Widget _buildReviewsSection(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Reviews + See All (CLICKABLE)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Reviews',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              GestureDetector(
                onTap: () {
                  // ✅ I-NAVIGATE SA ALL REVIEWS SCREEN
                  Navigator.pushNamed(
                    context,
                    '/all_reviews',
                    arguments: widget.productId,
                  );
                },
                child: const Text(
                  'See All',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Rating Summary
          Row(
            children: [
              Text(
                '${_product['rating']}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: List.generate(5, (index) {
                      return Icon(
                        index < (_product['rating'] as num).floor()
                            ? Icons.star
                            : Icons.star_border,
                        size: 16,
                        color: AppColors.gold,
                      );
                    }),
                  ),
                  Text(
                    '${_product['reviews']} reviews',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: AppColors.lightGray),

          // Individual Reviews (3 lang muna, "See All" para sa lahat)
          if (_reviews.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'No customer reviews yet.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.gray,
                  fontFamily: 'Poppins',
                ),
              ),
            )
          else
            ..._reviews.map(
              (review) => _buildReviewItem(
                name: review['name'],
                rating: review['rating'],
                comment: review['comment'],
                date: review['date'],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReviewItem({
    required String name,
    required double rating,
    required String comment,
    required String date,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: AppColors.softRose,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    name[0],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    Row(
                      children: [
                        ...List.generate(5, (index) {
                          return Icon(
                            index < rating.floor()
                                ? Icons.star
                                : Icons.star_border,
                            size: 12,
                            color: AppColors.gold,
                          );
                        }),
                        const SizedBox(width: 6),
                        Text(
                          date,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            comment,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              fontFamily: 'Poppins',
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
