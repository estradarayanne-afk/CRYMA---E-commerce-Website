import 'package:flutter/material.dart';
import '../utils/colors.dart';

// ============================================================
// CATEGORY MODEL
// ============================================================
class Category {
  final String id;
  final String name;
  final String items;
  final String imagePath;

  const Category({
    required this.id,
    required this.name,
    required this.items,
    required this.imagePath,
  });
}

// ============================================================
// CATEGORIES SCREEN
// ============================================================
class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  int _selectedIndex = 1;
  String _searchQuery = '';

  final List<Category> _allCategories = const [
    Category(
      id: '1',
      name: 'Pet Supplies',
      items: 'Browse products',
      imagePath: 'assets/image/others.jpg',
    ),
    Category(
      id: '2',
      name: 'Electronics & Gadgets',
      items: 'Browse products',
      imagePath: 'assets/image/electronics.jpg',
    ),
    Category(
      id: '3',
      name: "Women's Apparel",
      items: 'Browse products',
      imagePath: 'assets/image/fashion.jpg',
    ),
    Category(
      id: '4',
      name: "Men's Apparel",
      items: 'Browse products',
      imagePath: 'assets/image/fashion.jpg',
    ),
    Category(
      id: '5',
      name: 'Kids & Baby',
      items: 'Browse products',
      imagePath: 'assets/image/accessories.jpg',
    ),
    Category(
      id: '6',
      name: 'Home & Garden',
      items: 'Browse products',
      imagePath: 'assets/image/homes.jpg',
    ),
    Category(
      id: '7',
      name: 'Sports & Outdoors',
      items: 'Browse products',
      imagePath: 'assets/image/sports.jpg',
    ),
    Category(
      id: '8',
      name: 'Health & Beauty',
      items: 'Browse products',
      imagePath: 'assets/image/beauty.jpg',
    ),
    Category(
      id: '9',
      name: 'Books & Media',
      items: 'Browse products',
      imagePath: 'assets/image/others.jpg',
    ),
    Category(
      id: '10',
      name: 'Food & Gourmet',
      items: 'Browse products',
      imagePath: 'assets/image/food.jpg',
    ),
    Category(
      id: '11',
      name: 'Automotive & Motorcycle',
      items: 'Browse products',
      imagePath: 'assets/image/others.jpg',
    ),
    Category(
      id: '12',
      name: 'Furniture & Office Equipment',
      items: 'Browse products',
      imagePath: 'assets/image/homes.jpg',
    ),
    Category(
      id: '13',
      name: 'Jewelry & Watches',
      items: 'Browse products',
      imagePath: 'assets/image/accessories.jpg',
    ),
    Category(
      id: '14',
      name: 'Office & School Supplies',
      items: 'Browse products',
      imagePath: 'assets/image/school_supplies.jpg',
    ),
  ];

  List<Category> get _filteredCategories {
    if (_searchQuery.isEmpty) return _allCategories;
    return _allCategories
        .where((category) =>
            category.name.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  void _onNavItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, '/home');
        break;
      case 1:
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
    const crossAxisCount = 3;
    const spacing = 10.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Categories',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                      letterSpacing: 1,
                    ),
                  ),
                  Row(
                    children: [
                      Stack(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.notifications_outlined,
                                size: 22, color: AppColors.primary),
                            onPressed: () {
                              Navigator.pushNamed(context, '/notification');
                            },
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: Container(
                              width: 18,
                              height: 18,
                              decoration: const BoxDecoration(
                                color: AppColors.danger,
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Text(
                                  '3',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.white,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.chat_bubble_outline,
                            size: 22, color: AppColors.primary),
                        onPressed: () {
                          Navigator.pushNamed(context, '/chat_list');
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.shopping_cart_outlined,
                            size: 22, color: AppColors.primary),
                        onPressed: () {
                          Navigator.pushNamed(context, '/cart');
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // SEARCH BAR
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.lightGray),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search, size: 18, color: AppColors.gray),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search categories...',
                        hintStyle: TextStyle(
                          fontSize: 13,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _searchQuery = '';
                        });
                      },
                      child: const Icon(Icons.clear,
                          size: 18, color: AppColors.gray),
                    ),
                ],
              ),
            ),

            // ============================================================
            // CATEGORIES GRID - 3 COLUMNS - SCROLLABLE
            // ============================================================
            Expanded(
              child: _filteredCategories.isEmpty
                  ? const Center(
                      child: Text(
                        'No categories found',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: spacing,
                        mainAxisSpacing: spacing,
                        childAspectRatio:
                            0.7, // ✅ MAS MAGANDA ANG PROPORTION (mas matangkad)
                      ),
                      itemCount: _filteredCategories.length,
                      itemBuilder: (context, index) {
                        final category = _filteredCategories[index];
                        return _buildCategoryCard(category);
                      },
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border(
            top: BorderSide(color: AppColors.lightGray, width: 1),
          ),
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
  // CATEGORY CARD - MAS MALIIT PARA MAGKASYA LAHAT
  // ============================================================
  Widget _buildCategoryCard(Category category) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/search_results',
          arguments: {'category': category.name},
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // IMAGE - LOCAL ASSET
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
              child: Image.asset(
                category.imagePath,
                width: double.infinity,
                height: 70, // ✅ MAS MALIIT ANG IMAGE PARA MAGKASYA
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: double.infinity,
                    height: 70,
                    color: AppColors.lightGray,
                    child: const Icon(
                      Icons.image_not_supported,
                      size: 30,
                      color: AppColors.gray,
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(6.0), // ✅ MAS MALIIT ANG PADDING
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 11, // ✅ MAS MALIIT ANG FONT
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 1),
                  Text(
                    category.items,
                    style: const TextStyle(
                      fontSize: 9, // ✅ MAS MALIIT ANG FONT
                      color: AppColors.gray,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
