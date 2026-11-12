import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'dart:async';

import '../../services/api_service.dart';
import '../../services/cart_store.dart';
import '../../services/favorites_store.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_auth_guard.dart';

class ProductsDetailScreen extends StatefulWidget {
  const ProductsDetailScreen({super.key, this.productId, this.apiService});

  final String? productId;
  final ApiService? apiService;

  @override
  State<ProductsDetailScreen> createState() => _ProductsDetailScreenState();
}

class _ProductsDetailScreenState extends State<ProductsDetailScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  // ============================================================
  // PRODUCT DATA
  // ============================================================

  Map<String, dynamic> _product = {
    'id': '',
    'name': 'Loading product…',
    'price': 0,
    'originalPrice': 0,
    'rating': 0.0,
    'reviews': 0,
    'sold': 0,
    'category': '',
    'images': [''],
    'colors': <String>[],
    'stock': 0,
    'discount': 0,
  };

  // ============================================================
  // SPECIFICATION DATA
  // ============================================================
  List<Map<String, String>> get _specifications => [
        {'label': 'Category', 'value': _product['category'].toString()},
        {'label': 'Available Stock', 'value': _currentStock.toString()},
      ];

  String _selectedImage = '';
  String _selectedColor = 'Black';
  String _selectedSize = '';
  int _quantity = 1;
  final TextEditingController _quantityController =
      TextEditingController(text: '1');
  List<Map<String, dynamic>> _variants = [];
  final List<Map<String, dynamic>> _reviews = [];
  String? _selectedVariantId;
  bool _isLoading = true;
  bool _isFavorite = false;
  String? _loadError;

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

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

  ImageProvider? _imageProvider(String path) {
    if (path.isEmpty) return null;
    if (path.startsWith('http')) return NetworkImage(path);
    return AssetImage(path);
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
      final json = await _api.getProduct(widget.productId!);
      unawaited(_api.recordProductView(widget.productId!).then(
        (_) {},
        onError: (Object error, StackTrace stackTrace) {
          debugPrint('Unable to record product view: $error');
        },
      ));
      final rawImages = json['images'] as List? ?? [];
      final imagePaths = rawImages
          .map((image) => _api.resolveImageUrl(image.toString()))
          .toList();
      if (imagePaths.isEmpty && json['image'] != null) {
        imagePaths.add(
          _api.resolveImageUrl(json['image'].toString()),
        );
      }
      final variants = (json['variants'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();
      final colors = variants
          .map((variant) => variant['color']?.toString() ?? '')
          .where((color) => color.isNotEmpty)
          .toSet()
          .toList();
      Map<String, dynamic>? initialVariant;
      for (final variant in variants) {
        if ((int.tryParse(variant['stock']?.toString() ?? '') ?? 0) > 0) {
          initialVariant = variant;
          break;
        }
      }
      initialVariant ??= variants.isEmpty ? null : variants.first;
      final seller = json['seller'] is Map<String, dynamic>
          ? json['seller'] as Map<String, dynamic>
          : <String, dynamic>{};
      final sellerProfile = seller['seller_profile'] is Map<String, dynamic>
          ? seller['seller_profile'] as Map<String, dynamic>
          : <String, dynamic>{};
      final businessName = sellerProfile['business_name']?.toString().trim();
      final colorImage =
          initialVariant?['color_image_url']?.toString().trim() ?? '';
      final price = double.tryParse(json['price']?.toString() ?? '') ?? 0;
      final originalPrice =
          double.tryParse(json['original_price']?.toString() ?? '') ?? price;
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
          'colors': colors,
          'stock': int.tryParse(json['stock']?.toString() ?? '') ?? 0,
          'discount': originalPrice > 0
              ? ((originalPrice - price) / originalPrice * 100).round()
              : 0,
          'description': json['description']?.toString() ?? '',
          'seller': businessName == null || businessName.isEmpty
              ? 'CRYMA Shop'
              : businessName,
          'seller_id': seller['id']?.toString(),
          'store_slug': sellerProfile['store_slug']?.toString(),
        };
        _selectedImage = colorImage.isNotEmpty
            ? _api.resolveImageUrl(colorImage)
            : imagePaths.isEmpty
                ? ''
                : imagePaths.first;
        _selectedColor = initialVariant?['color']?.toString() ?? '';
        _selectedSize = initialVariant?['size']?.toString() ?? '';
        if (initialVariant != null) {
          _selectedVariantId = initialVariant['id']?.toString();
        }
        _isLoading = false;
      });
      if (await hasBuyerSession()) {
        _isFavorite = await FavoritesStore.instance.contains(widget.productId!);
      }
      if (mounted) setState(() {});
      await _loadProductReviews();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    final id = widget.productId;
    if (id == null) return;
    if (!await requireBuyerSignIn(
      context,
      title: 'Sign in to save favorites',
      message:
          'Create an account or sign in to save products to your wishlist.',
    )) {
      return;
    }
    await FavoritesStore.instance.toggle(id);
    if (mounted) setState(() => _isFavorite = !_isFavorite);
  }

  Future<void> _shareProduct() async {
    final id = widget.productId;
    if (id == null) return;
    await Clipboard.setData(
        ClipboardData(text: 'https://cryma.store/products/$id'));
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Product link copied.')));
    }
  }

  Future<void> _loadProductReviews() async {
    final id = widget.productId;
    if (id == null) return;
    try {
      final data = await _api.getProductReviews(id);
      final rows = (data['reviews'] as List? ?? const [])
          .whereType<Map<String, dynamic>>();
      if (!mounted) return;
      setState(() {
        _reviews
          ..clear()
          ..addAll(rows.map((review) {
            final buyer = review['buyer'] as Map<String, dynamic>?;
            return {
              'name': '${buyer?['first_name'] ?? ''} ${buyer?['last_name'] ?? ''}'
                      .trim()
                      .isEmpty
                  ? 'Buyer'
                  : '${buyer?['first_name'] ?? ''} ${buyer?['last_name'] ?? ''}'
                      .trim(),
              'rating':
                  double.tryParse(review['rating']?.toString() ?? '') ?? 0.0,
              'comment': review['comment']?.toString() ?? '',
              'date': review['created_at']?.toString() ?? '',
            };
          }));
        _product['rating'] =
            double.tryParse(data['average_rating']?.toString() ?? '') ?? 0;
        _product['reviews'] = data['review_count'] ?? _reviews.length;
      });
    } catch (_) {
      // Product detail remains usable if the optional review request fails.
    }
  }

  void _selectVariant(Map<String, dynamic> variant) {
    final colorImage = variant['color_image_url']?.toString().trim() ?? '';
    setState(() {
      _selectedVariantId = variant['id']?.toString();
      _selectedColor = variant['color']?.toString() ?? '';
      _selectedSize = variant['size']?.toString() ?? '';
      _quantity = 1;
      _quantityController.text = '1';
      if (colorImage.isNotEmpty) {
        _selectedImage = _api.resolveImageUrl(colorImage);
      }
    });
  }

  List<String> get _productColors =>
      List<String>.from(_product['colors'] as List? ?? const []);

  List<String> get _productSizes => _variants
      .where((variant) =>
          variant['size'] != null &&
          variant['size'].toString().trim().isNotEmpty &&
          (_selectedColor.isEmpty ||
              variant['color']?.toString() == _selectedColor))
      .map((variant) => variant['size'].toString())
      .toSet()
      .toList();

  bool _colorAvailable(String color) => _variants.any((variant) =>
      variant['color']?.toString() == color &&
      (int.tryParse(variant['stock']?.toString() ?? '') ?? 0) > 0);

  bool _sizeAvailable(String size) => _variants.any((variant) =>
      variant['size']?.toString() == size &&
      (_selectedColor.isEmpty ||
          variant['color']?.toString() == _selectedColor) &&
      (int.tryParse(variant['stock']?.toString() ?? '') ?? 0) > 0);

  void _selectColor(String color) {
    final availableVariants = _variants
        .where((variant) =>
            variant['color']?.toString() == color &&
            (int.tryParse(variant['stock']?.toString() ?? '') ?? 0) > 0)
        .toList();
    if (availableVariants.isEmpty) return;
    final variant = availableVariants.firstWhere(
      (row) => row['size']?.toString() == _selectedSize,
      orElse: () => availableVariants.first,
    );
    _selectVariant(variant);
  }

  void _selectSize(String size) {
    final variant = _variants.firstWhere(
      (row) =>
          row['size']?.toString() == size &&
          (_selectedColor.isEmpty ||
              row['color']?.toString() == _selectedColor) &&
          (int.tryParse(row['stock']?.toString() ?? '') ?? 0) > 0,
    );
    _selectVariant(variant);
  }

  Widget _buildColorOptions() {
    if (_productColors.isEmpty) return const SizedBox.shrink();
    const colorMap = <String, Color>{
      'Black': Colors.black,
      'Blue': Color(0xFF1E6FD9),
      'White': Color(0xFFF0EDE8),
      'Red': Color(0xFFD32F2F),
      'Green': Color(0xFF388E3C),
      'Yellow': Color(0xFFFBC02D),
      'Orange': Color(0xFFF57C00),
      'Purple': Color(0xFF7B1FA2),
      'Pink': Color(0xFFE91E8C),
      'Brown': Color(0xFF795548),
      'Gray': Color(0xFF9E9E9E),
      'Grey': Color(0xFF9E9E9E),
      'Navy': Color(0xFF1A237E),
      'Beige': Color(0xFFF5F0E8),
      'Gold': Color(0xFFFFB800),
      'Silver': Color(0xFFBDBDBD),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
            children: _productColors.map((color) {
              final selected = _selectedColor == color;
              final available = _colorAvailable(color);
              return GestureDetector(
                onTap: available ? () => _selectColor(color) : null,
                child: Opacity(
                  opacity: available ? 1 : 0.45,
                  child: Container(
                    margin: const EdgeInsets.only(right: 9),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color:
                          selected ? const Color(0xFFF1F7F7) : AppColors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected
                            ? AppColors.primary
                            : const Color(0xFFE5E5E5),
                        width: selected ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 15,
                          height: 15,
                          decoration: BoxDecoration(
                            color: colorMap[color] ?? AppColors.borderStrong,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: AppColors.borderNeutral, width: 0.5),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          color,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight:
                                selected ? FontWeight.w600 : FontWeight.w400,
                            color: selected
                                ? AppColors.primary
                                : AppColors.darkGray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildSizeOptions() {
    final sizes = _productSizes;
    if (sizes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Size',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.darkGray,
            fontFamily: 'Poppins',
          ),
        ),
        const SizedBox(height: 7),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: sizes.map((size) {
            final selected = _selectedSize == size;
            final available = _sizeAvailable(size);
            return GestureDetector(
              onTap: available ? () => _selectSize(size) : null,
              child: Opacity(
                opacity: available ? 1 : 0.45,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 48),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 13,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFFF1F7F7) : AppColors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : const Color(0xFFE5E5E5),
                      width: selected ? 1.5 : 1,
                    ),
                  ),
                  child: Text(
                    size,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      color: selected ? AppColors.primary : AppColors.darkGray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ============================================================
  // QUANTITY
  // ============================================================
  void _increaseQuantity() {
    if (_quantity < _currentStock) {
      _setQuantity(_quantity + 1);
    }
  }

  void _decreaseQuantity() {
    if (_quantity > 1) {
      _setQuantity(_quantity - 1);
    }
  }

  int _boundedQuantity(int quantity) {
    if (_currentStock <= 0) return 1;
    return quantity.clamp(1, _currentStock).toInt();
  }

  void _setQuantity(int quantity) {
    final bounded = _boundedQuantity(quantity);
    setState(() => _quantity = bounded);
    final text = bounded.toString();
    if (_quantityController.text != text) {
      _quantityController.value = TextEditingValue(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
      );
    }
  }

  void _handleQuantityInput(String value) {
    if (value.isEmpty) {
      setState(() => _quantity = 0);
      return;
    }
    final parsed = int.tryParse(value);
    if (parsed == null) return;
    final bounded = _boundedQuantity(parsed);
    setState(() => _quantity = bounded);
    if (bounded != parsed) {
      _quantityController.value = TextEditingValue(
        text: '$bounded',
        selection: TextSelection.collapsed(offset: bounded.toString().length),
      );
    }
  }

  void _onQuantityTapOutside(PointerDownEvent _) {
    _commitQuantityInput();
    FocusManager.instance.primaryFocus?.unfocus();
  }

  void _commitQuantityInput() {
    _setQuantity(int.tryParse(_quantityController.text) ?? 1);
  }

  void _showQuantityError() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Enter a quantity from 1 to available stock.')),
    );
  }

  Future<void> _addToCart({bool openCheckout = false}) async {
    if (_quantity < 1 || _quantity > _currentStock) {
      _showQuantityError();
      return;
    }
    if (!await requireBuyerSignIn(
      context,
      title: openCheckout ? 'Sign in to checkout' : 'Sign in to add to cart',
      message: 'Create an account or sign in to shop on CRYMA.',
    )) {
      return;
    }
    final selectedVariant = _selectedVariant;
    final variantPrice = selectedVariant == null
        ? null
        : selectedVariant['discounted_price'] ?? selectedVariant['price'];
    final item = <String, dynamic>{
      'id': _product['id'].toString(),
      'name': _product['name'],
      'price': variantPrice?.toString() ?? _product['price'],
      'quantity': _quantity,
      'stock': _currentStock,
      'image': _selectedImage,
      'seller': _product['seller'],
      'color': _selectedColor,
      'selected': true,
    };
    if (_selectedVariantId != null) item['variant_id'] = _selectedVariantId;
    final added = await CartStore.instance.add(item);
    if (!mounted) return;
    if (!added) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This product is out of stock.')),
      );
      return;
    }
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

  Future<void> _messageSeller() async {
    if (!await requireBuyerSignIn(
      context,
      title: 'Sign in to message this seller',
      message: 'Create an account or sign in to contact this seller.',
    )) {
      return;
    }
    try {
      final response = await _api.startBuyerSellerConversation(
        productId: widget.productId,
      );
      final conversation = response['data'];
      final id = conversation is Map<String, dynamic>
          ? conversation['id']?.toString()
          : null;
      if (!mounted) return;
      if (id == null) {
        throw const ApiException('The server did not return a conversation.');
      }
      await Navigator.pushNamed(context, '/chat_conversation', arguments: id);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

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
              SizedBox(
                width: 48,
                height: 54,
                child: Tooltip(
                  message: 'Message seller',
                  child: OutlinedButton(
                    onPressed: _messageSeller,
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      side: const BorderSide(color: AppColors.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Icon(
                      Icons.chat_bubble_outline,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
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
                        icon: Icon(
                          _isFavorite ? Icons.favorite : Icons.favorite_border,
                          size: 30,
                          color: _isFavorite
                              ? AppColors.danger
                              : AppColors.primary,
                        ),
                        tooltip: _isFavorite
                            ? 'Remove from wishlist'
                            : 'Add to wishlist',
                        onPressed: _toggleFavorite,
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        padding: EdgeInsets.zero,
                        icon: const Icon(
                          Icons.share_outlined,
                          size: 29,
                          color: AppColors.primary,
                        ),
                        tooltip: 'Copy product link',
                        onPressed: _shareProduct,
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
                    _buildReviewsSection(context),
                    const SizedBox(height: 104), // clears the 82dp bottom bar
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
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.surfaceNeutral,
                borderRadius: BorderRadius.circular(26),
              ),
              clipBehavior: Clip.antiAlias,
              child: _imageProvider(_selectedImage) == null
                  ? const Center(
                      child: Icon(Icons.image_not_supported_outlined,
                          size: 45, color: AppColors.gray))
                  : Image(
                      image: _imageProvider(_selectedImage)!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(
                              child: Icon(Icons.image_not_supported_outlined,
                                  size: 45, color: AppColors.gray)),
                    ),
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
          final bool isActive = _selectedImage == imagePath;

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
              child: _imageProvider(imagePath) == null
                  ? const Center(
                      child: Icon(Icons.image_not_supported_outlined,
                          size: 22, color: AppColors.gray))
                  : Image(
                      image: _imageProvider(imagePath)!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(
                              child: Icon(Icons.image_not_supported_outlined,
                                  size: 22, color: AppColors.gray)),
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
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderNeutral),
      ),
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.softRose,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderNeutral),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.storefront_outlined,
                    color: AppColors.primaryDark, size: 15),
                const SizedBox(width: 6),
                Text(
                  'Store: ${_product['seller']}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.primaryDark,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // RATING — only render when actual data exists
          if ((_product['rating'] as num? ?? 0) > 0) ...[
            Row(
              children: [
                Row(
                  children: List.generate(5, (i) {
                    final r = (_product['rating'] as num).toDouble();
                    final full = r.floor();
                    final hasHalf = (r - full) >= 0.5;
                    return Padding(
                      padding: const EdgeInsets.only(right: 2),
                      child: Icon(
                        i < full
                            ? Icons.star_rounded
                            : (i == full && hasHalf)
                                ? Icons.star_half_rounded
                                : Icons.star_outline_rounded,
                        size: 17,
                        color: AppColors.gold,
                      ),
                    );
                  }),
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
          ] else
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
              // Only show the strikethrough original price when there actually
              // is a discount — avoids showing ₱0 or identical prices.
              if ((_product['originalPrice'] as int? ?? 0) > _currentPrice) ...[
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.dangerSoft,
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
              ], // closes if (originalPrice > currentPrice)
            ],
          ),
          const SizedBox(height: 16),

          _buildColorOptions(),
          const SizedBox(height: 16),
          _buildSizeOptions(),
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
                  IconButton(
                    tooltip: 'Decrease quantity',
                    onPressed: _quantity > 1 ? _decreaseQuantity : null,
                    style: IconButton.styleFrom(
                      fixedSize: const Size(40, 40),
                      backgroundColor: AppColors.surface,
                      disabledBackgroundColor: AppColors.surfaceNeutral,
                      foregroundColor: AppColors.primaryDark,
                      disabledForegroundColor: AppColors.textSubtle,
                      side: const BorderSide(color: AppColors.borderNeutral),
                      shape: const CircleBorder(),
                      padding: EdgeInsets.zero,
                    ),
                    icon: const Icon(Icons.remove_rounded, size: 18),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 44,
                    height: 40,
                    child: TextField(
                      key: const ValueKey('product-quantity'),
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      onChanged: _handleQuantityInput,
                      onSubmitted: (_) => _commitQuantityInput(),
                      onTapOutside: _onQuantityTapOutside,
                      decoration: InputDecoration(
                        contentPadding: EdgeInsets.zero,
                        filled: true,
                        fillColor: AppColors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(11),
                          borderSide:
                              const BorderSide(color: AppColors.borderNeutral),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(11),
                          borderSide:
                              const BorderSide(color: AppColors.borderNeutral),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(11),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 1.5,
                          ),
                        ),
                      ),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    tooltip: 'Increase quantity',
                    onPressed:
                        _quantity < _currentStock ? _increaseQuantity : null,
                    style: IconButton.styleFrom(
                      fixedSize: const Size(40, 40),
                      backgroundColor: AppColors.surface,
                      disabledBackgroundColor: AppColors.surfaceNeutral,
                      foregroundColor: AppColors.primaryDark,
                      disabledForegroundColor: AppColors.textSubtle,
                      side: const BorderSide(color: AppColors.borderNeutral),
                      shape: const CircleBorder(),
                      padding: EdgeInsets.zero,
                    ),
                    icon: const Icon(Icons.add_rounded, size: 18),
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderNeutral),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Product details',
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
          if ((_product['store_slug'] ?? '').toString().isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Divider(height: 1, color: AppColors.borderNeutral),
            ),
            OutlinedButton(
              onPressed: () => Navigator.pushNamed(
                context,
                '/storefront',
                arguments: _product['store_slug'],
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                side: const BorderSide(color: AppColors.borderNeutral),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
                foregroundColor: AppColors.primary,
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: AppColors.softRose,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.storefront_outlined,
                      size: 19,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _product['seller']?.toString() ?? 'CRYMA Shop',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.darkGray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Visit this store',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, size: 20),
                ],
              ),
            ),
          ],
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
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderNeutral),
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
