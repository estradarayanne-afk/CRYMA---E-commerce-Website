import 'package:flutter/material.dart';
import '../models/buyer_category.dart';
import '../utils/colors.dart';
import '../widgets/buyer_bottom_navigation_bar.dart';

// ============================================================
// CATEGORIES SCREEN
// ============================================================
class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  String _searchQuery = '';

  List<BuyerCategory> get _filteredCategories {
    if (_searchQuery.isEmpty) return _allCategories;
    return _allCategories
        .where((category) =>
            category.name.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  List<BuyerCategory> get _allCategories => buyerCategories;

  void _onNavItemTapped(int index) {
    BuyerBottomNavigationBar.navigateToTab(context, index, 1);
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
                    child: const Icon(Icons.grid_view_rounded,
                        color: AppColors.primary, size: 21),
                  ),
                  const SizedBox(width: 11),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Explore categories',
                          style: TextStyle(
                            fontSize: 17,
                            height: 1.15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.wine,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Find something you will love',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.gray,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Order activity',
                    icon: const Icon(Icons.notifications_none_rounded),
                    onPressed: () =>
                        Navigator.pushNamed(context, '/notification'),
                  ),
                  IconButton(
                    tooltip: 'Messages',
                    icon: const Icon(Icons.chat_bubble_outline_rounded),
                    onPressed: () {
                      Navigator.pushNamed(context, '/chat_list');
                    },
                  ),
                ],
              ),
            ),

            // SEARCH BAR
            Container(
              margin: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderNeutral),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded,
                      size: 20, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.darkGray,
                        fontFamily: 'Poppins',
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search categories',
                        hintStyle: TextStyle(
                          fontSize: 12,
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
                      child: const Icon(Icons.close_rounded,
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
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final columns = constraints.maxWidth >= 600 ? 3 : 2;
                        return GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: columns,
                            crossAxisSpacing: 13,
                            mainAxisSpacing: 13,
                            childAspectRatio: 0.9,
                          ),
                          itemCount: _filteredCategories.length,
                          itemBuilder: (context, index) =>
                              _buildCategoryCard(_filteredCategories[index]),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 1,
        onDestinationSelected: _onNavItemTapped,
      ),
    );
  }

  // ============================================================
  // CATEGORY CARD - MAS MALIIT PARA MAGKASYA LAHAT
  // ============================================================
  Widget _buildCategoryCard(BuyerCategory category) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(
            context,
            '/search_results',
            arguments: {'category': category.name},
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    category.imagePath,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const ColoredBox(
                      color: AppColors.softRose,
                      child: Center(
                        child: Icon(Icons.image_not_supported_outlined,
                            size: 32, color: AppColors.gray),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 9,
                    bottom: 9,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: .94),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.arrow_forward_rounded,
                          size: 16, color: AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(11, 9, 8, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      color: AppColors.wine,
                      fontFamily: 'Poppins',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    category.items,
                    style: const TextStyle(
                      fontSize: 10,
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
