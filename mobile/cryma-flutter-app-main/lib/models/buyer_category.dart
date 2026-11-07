import 'package:flutter/material.dart';

class BuyerCategory {
  const BuyerCategory({
    required this.id,
    required this.name,
    required this.imagePath,
    required this.icon,
  });

  final String id;
  final String name;

  /// Local asset path for the category image.
  final String imagePath;

  /// Icon used in the home screen horizontal scroller.
  final IconData icon;
}

/// The canonical category list used by HomeScreen, CategoriesScreen, and
/// SearchResultsScreen. Keep this as the single source of truth so all three
/// screens remain consistent.
const buyerCategories = <BuyerCategory>[
  BuyerCategory(
    id: '1',
    name: 'Pet Supplies',
    imagePath: 'assets/image/others.jpg',
    icon: Icons.pets_rounded,
  ),
  BuyerCategory(
    id: '2',
    name: 'Electronics & Gadgets',
    imagePath: 'assets/image/categories/electronics.jpg',
    icon: Icons.devices_rounded,
  ),
  BuyerCategory(
    id: '3',
    name: "Women's Apparel",
    imagePath: 'assets/image/categories/fashion.jpg',
    icon: Icons.checkroom_rounded,
  ),
  BuyerCategory(
    id: '4',
    name: "Men's Apparel",
    imagePath: 'assets/image/categories/fashion.jpg',
    icon: Icons.dry_cleaning_rounded,
  ),
  BuyerCategory(
    id: '5',
    name: 'Kids & Baby',
    imagePath: 'assets/image/categories/accessories.jpg',
    icon: Icons.child_friendly_rounded,
  ),
  BuyerCategory(
    id: '6',
    name: 'Home & Garden',
    imagePath: 'assets/image/categories/homes.jpg',
    icon: Icons.home_rounded,
  ),
  BuyerCategory(
    id: '7',
    name: 'Sports & Outdoors',
    imagePath: 'assets/image/categories/sports.jpg',
    icon: Icons.sports_basketball_rounded,
  ),
  BuyerCategory(
    id: '8',
    name: 'Health & Beauty',
    imagePath: 'assets/image/categories/beauty.jpg',
    icon: Icons.spa_rounded,
  ),
  BuyerCategory(
    id: '9',
    name: 'Books & Media',
    imagePath: 'assets/image/others.jpg',
    icon: Icons.menu_book_rounded,
  ),
  BuyerCategory(
    id: '10',
    name: 'Food & Gourmet',
    imagePath: 'assets/image/categories/food.jpg',
    icon: Icons.restaurant_rounded,
  ),
  BuyerCategory(
    id: '11',
    name: 'Automotive & Motorcycle',
    imagePath: 'assets/image/others.jpg',
    icon: Icons.two_wheeler_rounded,
  ),
  BuyerCategory(
    id: '12',
    name: 'Furniture & Office Equipment',
    imagePath: 'assets/image/categories/homes.jpg',
    icon: Icons.chair_rounded,
  ),
  BuyerCategory(
    id: '13',
    name: 'Jewelry & Watches',
    imagePath: 'assets/image/categories/accessories.jpg',
    icon: Icons.diamond_rounded,
  ),
  BuyerCategory(
    id: '14',
    name: 'Office & School Supplies',
    imagePath: 'assets/image/categories/school_supplies.jpg',
    icon: Icons.school_rounded,
  ),
];
