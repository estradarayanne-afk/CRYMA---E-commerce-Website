import 'package:flutter/material.dart';
import '../utils/colors.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),
      body: SafeArea(
        child: Column(
          children: [
            // ============================================================
            // HEADER
            // ============================================================
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Account',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.pushNamed(context, '/notification');
                    },
                    child: const Icon(
                      Icons.notifications_outlined,
                      size: 24,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),

            // ============================================================
            // BODY
            // ============================================================
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    // ============================================================
                    // ✅ PROFILE SECTION - FULL WIDTH + MAY BORDER (LINE)
                    // ============================================================
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(
                          color: const Color(0xFFE8E8E8),
                          width: 1,
                        ),
                      ),
                      padding: const EdgeInsets.only(
                        top: 32,
                        bottom: 80,
                      ),
                      child: Column(
                        children: [
                          // Avatar
                          Container(
                            width: 100,
                            height: 100,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.lightGray,
                              image: DecorationImage(
                                image: NetworkImage(
                                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
                                ),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Name
                          const Text(
                            'Juan Dela Cruz',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Email
                          const Text(
                            'juan.delacruz@email.com',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.gray,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Edit Profile Button
                          GestureDetector(
                            onTap: () {
                              Navigator.pushNamed(context, '/edit_profile');
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 28, vertical: 10),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                    color: AppColors.primary, width: 1.5),
                              ),
                              child: const Text(
                                'Edit Profile',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                  fontFamily: 'Poppins',
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // ============================================================
                    // MENU SECTIONS
                    // ============================================================
                    const SizedBox(height: 16),

                    // MY ACCOUNT
                    _buildMenuSection(
                      context: context,
                      title: 'MY ACCOUNT',
                      items: const [
                        _MenuItem(
                            icon: Icons.person_outline,
                            label: 'Personal Information',
                            route: '/edit_profile'),
                        _MenuItem(
                            icon: Icons.location_on_outlined,
                            label: 'Address Book',
                            route: '/address_book'),
                        _MenuItem(
                            icon: Icons.wallet_outlined,
                            label: 'Payment Methods',
                            route: '/payment_methods'),
                      ],
                    ),

                    // MY SHOPPING
                    _buildMenuSection(
                      context: context,
                      title: 'MY SHOPPING',
                      items: const [
                        _MenuItem(
                            icon: Icons.description_outlined,
                            label: 'My Orders',
                            route: '/my_orders'),
                        _MenuItem(
                            icon: Icons.star_outline,
                            label: 'My Reviews',
                            route: '/my_reviews'),
                        _MenuItem(
                            icon: Icons.local_offer_outlined,
                            label: 'Vouchers',
                            route: '/vouchers'),
                        _MenuItem(
                            icon: Icons.favorite_border,
                            label: 'Wishlist',
                            route: '/wishlist'),
                      ],
                    ),

                    // SUPPORT
                    _buildMenuSection(
                      context: context,
                      title: 'SUPPORT',
                      items: const [
                        _MenuItem(
                            icon: Icons.chat_bubble_outline,
                            label: 'Customer Support',
                            route: '/support'),
                        _MenuItem(
                            icon: Icons.help_outline,
                            label: 'Help Center',
                            route: '/help_center'),
                        _MenuItem(
                            icon: Icons.description_outlined,
                            label: 'Terms & Conditions',
                            route: '/terms'),
                        _MenuItem(
                            icon: Icons.shield_outlined,
                            label: 'Privacy Policy',
                            route: '/privacy'),
                      ],
                    ),

                    // SECURITY
                    _buildMenuSection(
                      context: context,
                      title: 'SECURITY',
                      items: const [
                        _MenuItem(
                            icon: Icons.key_outlined,
                            label: 'Change Password',
                            route: '/change_password'),
                        _MenuItem(
                            icon: Icons.shield_outlined,
                            label: 'Security Settings',
                            route: '/security_settings'),
                      ],
                    ),

                    // ============================================================
                    // LOGOUT BUTTON
                    // ============================================================
                    GestureDetector(
                      onTap: () {
                        Navigator.pushNamed(context, '/logout_confirmation');
                      },
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF5F5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: const Color(0xFFFCD5D5), width: 1),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.logout_outlined,
                                size: 20, color: AppColors.danger),
                            SizedBox(width: 8),
                            Text(
                              'Logout',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppColors.danger,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
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
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: AppColors.lightGray, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: 4,
          onTap: (index) {
            switch (index) {
              case 0:
                Navigator.pushReplacementNamed(context, '/home');
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
                break;
            }
          },
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
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
              icon: Icon(Icons.person),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // MENU SECTION
  // ============================================================
  Widget _buildMenuSection({
    required BuildContext context,
    required String title,
    required List<_MenuItem> items,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, bottom: 8),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.gray,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Column(
              children: items.map((item) {
                final isLast = item == items.last;
                return _buildMenuItem(context, item, isLast);
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // MENU ITEM
  // ============================================================
  Widget _buildMenuItem(BuildContext context, _MenuItem item, bool isLast) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, item.route);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          border: isLast
              ? null
              : const Border(
                  bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1),
                ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFE8F3F2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                item.icon,
                size: 20,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.label,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.darkGray,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              size: 18,
              color: AppColors.gray,
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final String route;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.route,
  });
}
