import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

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
    final firstImage =
        json['image']?.toString() ??
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
          ? 'assets/image/headphones.jpg'
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
  int _selectedIndex = 0;
  final Map<String, bool> _isLiked = {};
  List<Product> _featuredProducts = [];
  bool _productsLoading = true;
  String? _productsError;

  @override
  void initState() {
    super.initState();
    _loadFeaturedProducts();
  }

  Future<void> _loadFeaturedProducts() async {
    setState(() {
      _productsLoading = true;
      _productsError = null;
    });
    try {
      final rows = await ApiService.instance.getProducts();
      if (!mounted) return;
      setState(() {
        _featuredProducts = rows.map(Product.fromJson).toList();
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

  void _toggleLike(String id) {
    setState(() {
      _isLiked[id] = !(_isLiked[id] ?? false);
    });
  }

  void _onNavItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    switch (index) {
      case 0:
        break;
      case 1:
        Navigator.pushNamed(context, '/categories');
        break;
      case 2:
        Navigator.pushNamed(context, '/cart');
        break;
      case 3:
        Navigator.pushNamed(context, '/my_orders');
        break;
      case 4:
        Navigator.pushNamed(context, '/account');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'CRYMA',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  Row(
                    children: [
                      Stack(
                        children: [
                          IconButton(
                            icon: const Icon(
                              Icons.notifications_outlined,
                              color: AppColors.primary,
                            ),
                            onPressed: () {
                              Navigator.pushNamed(context, '/notification');
                            },
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.danger,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.chat_bubble_outline,
                          color: AppColors.primary,
                        ),
                        onPressed: () {
                          Navigator.pushNamed(context, '/chat_list');
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // SEARCH BAR
            GestureDetector(
              onTap: () {
                Navigator.pushNamed(context, '/search');
              },
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.lightGray),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search, color: AppColors.gray, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Search products, brands...',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.gray,
                        fontFamily: 'Poppins',
                      ),
                    ),
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
                    _buildCategoriesSection(),
                    _buildFeaturedProductsSection(),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),

      // ============================================================
      // BOTTOM NAVIGATION
      // ============================================================
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: AppColors.lightGray, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onNavItemTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.gray,
          selectedLabelStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 10,
          ),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined),
              label: 'Categories',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.shopping_cart_outlined),
              label: 'Cart',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.list_alt_outlined),
              label: 'Orders',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outlined),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // HERO BANNER
  // ============================================================
  Widget _buildBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 31),
      height: 150,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        image: const DecorationImage(
          image: AssetImage('assets/image/welcome_page.jpg'),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: AppColors.primary.withValues(alpha: 0.35),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            const Text(
              'DISCOVER MORE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.white,
                fontFamily: 'Poppins',
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Everything You Need,\nAll in One Place.',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
                fontFamily: 'Poppins',
                height: 1.1,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Shop Now →',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // CATEGORIES SECTION
  // ============================================================
  Widget _buildCategoriesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Categories', 'See All', () {
          Navigator.pushNamed(context, '/categories');
        }),
        SizedBox(
          height: 92,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final category = _categories[index];
              return _buildCategoryItem(category);
            },
          ),
        ),

        // Scroll indicator
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 3,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 4),
              ...List.generate(4, (index) {
                return Container(
                  width: 8,
                  height: 3,
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: AppColors.lightGray,
                    borderRadius: BorderRadius.circular(2),
                  ),
                );
              }),
              const Spacer(),
            ],
          ),
        ),
        const SizedBox(height: 4),
      ],
    );
  }

  // ============================================================
  // CATEGORY ITEM
  // ============================================================
  Widget _buildCategoryItem(Category category) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/search_results',
          arguments: {'category': category.name},
        );
      },
      child: Container(
        margin: const EdgeInsets.only(right: 16),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.lightGray,
                image: DecorationImage(
                  image: AssetImage(category.imageUrl),
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              style: const TextStyle(
                fontSize: 12,
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

  // ============================================================
  // FEATURED PRODUCTS
  // ============================================================
  Widget _buildFeaturedProductsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Featured Products', 'View All', () {
          Navigator.pushNamed(context, '/categories');
        }),
        if (_productsLoading)
          const Padding(
            padding: EdgeInsets.all(24),
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
                  child: const Text('Retry'),
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _featuredProducts.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 0.62,
              ),
              itemBuilder: (context, index) =>
                  _buildProductCard(_featuredProducts[index]),
            ),
          ),
      ],
    );
  }

  // ============================================================
  // PRODUCT CARD
  // ============================================================
  Widget _buildProductCard(Product product) {
    final isLiked = _isLiked[product.id] ?? false;

    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/product_detail', arguments: product.id);
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            Stack(
              children: [
                Container(
                  height: 130,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: AppColors.lightGray,
                    image: DecorationImage(
                      image: product.imageUrl.startsWith('http')
                          ? NetworkImage(product.imageUrl)
                          : AssetImage(product.imageUrl) as ImageProvider,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),

                // SALE BADGE
                if (product.isSale)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.circular(4),
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

                // LIKE BUTTON
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => _toggleLike(product.id),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: Colors.black26,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        size: 16,
                        color: isLiked ? AppColors.danger : AppColors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // CATEGORY
            Text(
              product.category,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
                fontFamily: 'Poppins',
                letterSpacing: 0.5,
              ),
            ),

            // NAME
            Text(
              product.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
                fontFamily: 'Poppins',
              ),
            ),

            const SizedBox(height: 4),

            // RATING
            Row(
              children: [
                const Icon(Icons.star, color: AppColors.gold, size: 14),
                const SizedBox(width: 4),
                Text(
                  product.rating.toString(),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 4),

            // PRICE
            Row(
              children: [
                Text(
                  '₱${product.price}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '₱${product.originalPrice}',
                  style: const TextStyle(
                    fontSize: 11,
                    decoration: TextDecoration.lineThrough,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // SECTION HEADER
  // ============================================================
  Widget _buildSectionHeader(
    String title,
    String actionText,
    VoidCallback onTap,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              fontFamily: 'Poppins',
            ),
          ),
          GestureDetector(
            onTap: onTap,
            child: Text(
              actionText,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.primary,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
