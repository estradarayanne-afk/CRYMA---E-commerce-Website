import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import '../services/api_service.dart';
import '../services/favorites_store.dart';
import '../utils/colors.dart';
import '../widgets/buyer_bottom_navigation_bar.dart';

// ============================================================
// MODELS
// ============================================================
class Category {
  final String id;
  final String name;
  final FaIconData icon;
  final String imageUrl;

  const Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.imageUrl,
  });
}

class Product {
  final String id;
  final String category;
  final String name;
  final double rating;
  final int price;
  final int originalPrice;
  final String imageUrl;
  final bool isSale;

  const Product({
    required this.id,
    required this.category,
    required this.name,
    required this.rating,
    required this.price,
    required this.originalPrice,
    required this.imageUrl,
    this.isSale = false,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final images = json['images'];
    final firstImage = json['image']?.toString() ??
        (images is List && images.isNotEmpty ? images.first.toString() : '');
    final price = double.tryParse(json['price']?.toString() ?? '') ?? 0;
    final originalPrice =
        double.tryParse(json['original_price']?.toString() ?? '') ?? price;
    return Product(
      id: json['id'].toString(),
      category: json['category']?.toString() ?? 'Other',
      name: json['name']?.toString() ?? 'Product',
      rating: double.tryParse(json['average_rating']?.toString() ?? '') ?? 0,
      price: price.round(),
      originalPrice: originalPrice.round(),
      imageUrl: firstImage.isEmpty
          ? ''
          : ApiService.instance.resolveImageUrl(firstImage),
      isSale: originalPrice > price,
    );
  }
}

// ============================================================
// HOME SCREEN
// ============================================================
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final Map<String, bool> _isLiked = {};
  List<Product> _featuredProducts = [];
  bool _productsLoading = true;
  String? _productsError;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
    _loadFeaturedProducts();
  }

  Future<void> _loadFavorites() async {
    final ids = await FavoritesStore.instance.getIds();
    if (!mounted) return;
    setState(() {
      _isLiked.addEntries(ids.map((id) => MapEntry(id, true)));
    });
  }

  Future<void> _loadFeaturedProducts() async {
    setState(() {
      _productsLoading = true;
      _productsError = null;
    });
    try {
      final page = await ApiService.instance.getProductsPage(
        perPage: 8,
        sort: 'featured',
      );
      if (!mounted) return;
      setState(() {
        _featuredProducts = page.items.map(Product.fromJson).toList();
        _productsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _productsError = error.toString();
        _productsLoading = false;
      });
    }
  }

  // ============================================================
  // LOCAL CATEGORIES
  // ============================================================
  final List<Category> _categories = const [
    Category(
      id: '1',
      name: "Women's Apparel",
      icon: FontAwesomeIcons.shirt,
      imageUrl: 'assets/image/fashion.jpg',
    ),
    Category(
      id: '2',
      name: 'Health & Beauty',
      icon: FontAwesomeIcons.leaf,
      imageUrl: 'assets/image/beauty.jpg',
    ),
    Category(
      id: '3',
      name: 'Electronics & Gadgets',
      icon: FontAwesomeIcons.mobileScreen,
      imageUrl: 'assets/image/electronics.jpg',
    ),
    Category(
      id: '4',
      name: 'Home & Garden',
      icon: FontAwesomeIcons.house,
      imageUrl: 'assets/image/homes.jpg',
    ),
    Category(
      id: '5',
      name: 'Sports & Outdoors',
      icon: FontAwesomeIcons.basketball,
      imageUrl: 'assets/image/sports.jpg',
    ),
  ];

  Future<void> _toggleLike(String id) async {
    await FavoritesStore.instance.toggle(id);
    if (!mounted) return;
    setState(() => _isLiked[id] = !(_isLiked[id] ?? false));
  }

  void _onNavItemTapped(int index) {
    BuyerBottomNavigationBar.navigateToTab(context, index, 0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.fromLTRB(20, 10, 12, 8),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.softRose,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(
                      Icons.storefront_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 11),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CRYMA',
                        style: TextStyle(
                          fontSize: 19,
                          height: 1.1,
                          fontWeight: FontWeight.bold,
                          color: AppColors.wine,
                          fontFamily: 'Poppins',
                          letterSpacing: 0.5,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Good finds, closer to home',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: 'Notifications',
                    icon: const Icon(Icons.notifications_none_rounded),
                    onPressed: () =>
                        Navigator.pushNamed(context, '/notification'),
                  ),
                  IconButton(
                    tooltip: 'Messages',
                    icon: const Icon(Icons.chat_bubble_outline_rounded),
                    onPressed: () => Navigator.pushNamed(context, '/chat_list'),
                  ),
                ],
              ),
            ),

            // SEARCH BAR
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                Navigator.pushNamed(context, '/search');
              },
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderNeutral),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search_rounded,
                        color: AppColors.primary, size: 21),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Search products, brands...',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                    Icon(Icons.tune_rounded,
                        color: AppColors.textSubtle, size: 18),
                  ],
                ),
              ),
            ),

            // BODY
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    _buildBanner(),
                    const SizedBox(height: 8),
                    _buildCategoriesSection(),
                    const SizedBox(height: 4),
                    _buildFeaturedProductsSection(),
                    const SizedBox(height: 18),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 0,
        onDestinationSelected: _onNavItemTapped,
      ),
    );
  }

  Widget _buildBanner() {
    return InkWell(
      onTap: () => Navigator.pushNamed(context, '/categories'),
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: double.infinity,
        height: 204,
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          image: const DecorationImage(
            image: AssetImage('assets/image/welcome_page.jpg'),
            fit: BoxFit.cover,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AppColors.primaryDark.withValues(alpha: .94),
                AppColors.primary.withValues(alpha: .72),
                AppColors.primaryDark.withValues(alpha: .08),
              ],
              stops: const [0, .64, 1],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 17, 18, 17),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.white.withValues(alpha: .16),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.white.withValues(alpha: .35),
                    ),
                  ),
                  child: const Text(
                    'LOCAL FINDS · REAL PEOPLE',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: AppColors.white,
                      fontFamily: 'Poppins',
                      letterSpacing: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 9),
                const Text(
                  'Good things\nmove closer.',
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.bold,
                    color: AppColors.white,
                    fontFamily: 'Poppins',
                    height: 1.05,
                  ),
                ),
                const SizedBox(height: 11),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Explore the shop',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryDark,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      SizedBox(width: 5),
                      Icon(Icons.arrow_forward_rounded,
                          size: 14, color: AppColors.primaryDark),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Shop by category', 'See all', () {
          Navigator.pushNamed(context, '/categories');
        }),
        SizedBox(
          height: 105,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _buildCategoryItem(_categories[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryItem(Category category) {
    return SizedBox(
      width: 82,
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(
            context,
            '/search_results',
            arguments: {'category': category.name},
          );
        },
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                category.imageUrl,
                width: 62,
                height: 62,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 62,
                  height: 62,
                  color: AppColors.softRose,
                  child:
                      FaIcon(category.icon, color: AppColors.primary, size: 23),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                height: 1.15,
                fontWeight: FontWeight.w500,
                color: AppColors.darkGray,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeaturedProductsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Picked for you', 'View all', () {
          Navigator.pushNamed(context, '/categories');
        }),
        if (_productsLoading)
          const Padding(
            padding: EdgeInsets.all(30),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_productsError != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Text(_productsError!, textAlign: TextAlign.center),
                TextButton(
                  onPressed: _loadFeaturedProducts,
                  child: const Text('Try again'),
                ),
              ],
            ),
          )
        else if (_featuredProducts.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('No products are available yet.')),
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 600 ? 3 : 2;
              return GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  mainAxisExtent: 304,
                ),
                itemCount: _featuredProducts.length,
                itemBuilder: (context, index) =>
                    _buildProductCard(_featuredProducts[index]),
              );
            },
          ),
      ],
    );
  }

  Widget _buildProductCard(Product product) {
    final isLiked = _isLiked[product.id] ?? false;

    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(17),
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(context, '/product_detail',
              arguments: product.id);
        },
        borderRadius: BorderRadius.circular(17),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: product.imageUrl.isEmpty
                            ? const ColoredBox(
                                color: AppColors.softRose,
                                child: Center(
                                  child: Icon(
                                    Icons.image_not_supported_outlined,
                                    color: AppColors.gray,
                                    size: 34,
                                  ),
                                ),
                              )
                            : Image(
                                image: product.imageUrl.startsWith('http')
                                    ? NetworkImage(product.imageUrl)
                                    : AssetImage(product.imageUrl),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const ColoredBox(
                                  color: AppColors.softRose,
                                  child: Center(
                                    child: Icon(
                                      Icons.image_not_supported_outlined,
                                      color: AppColors.gray,
                                      size: 34,
                                    ),
                                  ),
                                ),
                              ),
                      ),
                    ),
                    if (product.isSale)
                      Positioned(
                        top: 7,
                        left: 7,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: const Text(
                            'SALE',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: AppColors.white,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      top: 5,
                      right: 5,
                      child: Material(
                        color: AppColors.white.withValues(alpha: .94),
                        shape: const CircleBorder(),
                        child: IconButton(
                          tooltip: isLiked
                              ? 'Remove from wishlist'
                              : 'Add to wishlist',
                          visualDensity: VisualDensity.compact,
                          onPressed: () => _toggleLike(product.id),
                          icon: Icon(
                            isLiked ? Icons.favorite : Icons.favorite_border,
                            size: 18,
                            color: isLiked ? AppColors.danger : AppColors.wine,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.category,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                  letterSpacing: 0.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.2,
                  fontWeight: FontWeight.w600,
                  color: AppColors.wine,
                  fontFamily: 'Poppins',
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.star_rounded,
                      color: AppColors.gold, size: 14),
                  const SizedBox(width: 3),
                  Text(
                    product.rating > 0
                        ? product.rating.toStringAsFixed(1)
                        : 'New',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '₱${product.price}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryDark,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
              if (product.isSale)
                Padding(
                  padding: const EdgeInsets.only(top: 1),
                  child: Text(
                    '₱${product.originalPrice}',
                    style: const TextStyle(
                      fontSize: 9,
                      decoration: TextDecoration.lineThrough,
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    String title,
    String actionText,
    VoidCallback onTap,
  ) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.wine,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          TextButton(
            onPressed: onTap,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              minimumSize: const Size(0, 34),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  actionText,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(width: 2),
                const Icon(Icons.chevron_right_rounded, size: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
