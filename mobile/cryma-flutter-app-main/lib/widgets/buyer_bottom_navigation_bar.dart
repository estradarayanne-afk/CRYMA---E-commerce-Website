import 'package:flutter/material.dart';

import '../utils/colors.dart';

class BuyerBottomNavigationBar extends StatelessWidget {
  const BuyerBottomNavigationBar({
    required this.currentIndex,
    required this.onDestinationSelected,
    super.key,
  });

  final int currentIndex;
  final ValueChanged<int> onDestinationSelected;

  static const _tabRoutes = [
    '/home',
    '/categories',
    '/cart',
    '/my_orders',
    '/account',
  ];

  static void navigateToTab(
    BuildContext context,
    int index,
    int currentIndex,
  ) {
    if (index == currentIndex || index < 0 || index >= _tabRoutes.length) {
      return;
    }

    final navigator = Navigator.of(context);
    final route = _tabRoutes[index];
    if (index == 0) {
      navigator.popUntil(
        (route) => route.settings.name == '/home' || route.isFirst,
      );
      return;
    }

    navigator.pushNamedAndRemoveUntil(
      route,
      (route) => route.settings.name == '/home' || route.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(
            top: BorderSide(color: AppColors.lightGray, width: 1),
          ),
        ),
        child: NavigationBar(
          height: 76,
          selectedIndex: currentIndex,
          onDestinationSelected: onDestinationSelected,
          backgroundColor: AppColors.white,
          surfaceTintColor: AppColors.white,
          elevation: 0,
          indicatorColor: AppColors.softRose,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view_rounded),
              label: 'Categories',
            ),
            NavigationDestination(
              icon: Icon(Icons.shopping_bag_outlined),
              selectedIcon: Icon(Icons.shopping_bag_rounded),
              label: 'Cart',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'Orders',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}
